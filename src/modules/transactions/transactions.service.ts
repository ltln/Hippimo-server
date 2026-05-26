import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
  CategoryType,
  Prisma,
  TransactionType,
} from 'src/core/prisma/prisma.client';
import { S3Service } from 'src/providers/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { ReceiptProcessingQueueService } from './receipt-processing.queue.service';

export interface ReceiptImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

type PreparedReceiptUpload = {
  receiptId: string;
  key: string;
  body: Buffer;
  contentType: string;
};

type StoredReceiptUpload = PreparedReceiptUpload & {
  url: string;
};

const MAX_RECEIPT_IMAGES_PER_TRANSACTION = 5;
const MAX_RECEIPT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const receiptSelect = {
  receiptId: true,
} as const;

const receiptMutationSelect = {
  receiptId: true,
  imageUrl: true,
} as const;

const transactionSummarySelect = {
  transactionId: true,
  userId: true,
  walletId: true,
  toWalletId: true,
  categoryId: true,
  amount: true,
  type: true,
  transactionDate: true,
  notes: true,
  isExcludedFromReport: true,
  aiSuggestedCategoryId: true,
  isEssential: true,
  createdAt: true,
  receipts: {
    select: receiptSelect,
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly receiptProcessingQueue: ReceiptProcessingQueueService,
  ) {}

  async findAllByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: transactionSummarySelect,
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        transactionId: id,
        userId,
        deletedAt: null,
      },
      select: {
        transactionId: true,
        userId: true,
        walletId: true,
        toWalletId: true,
        categoryId: true,
        amount: true,
        type: true,
        transactionDate: true,
        notes: true,
        isExcludedFromReport: true,
        aiSuggestedCategoryId: true,
        isEssential: true,
        createdAt: true,
        receipts: {
          select: receiptMutationSelect,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      ...transaction,
      receipts: await Promise.all(
        transaction.receipts.map(async (receipt) => ({
          receiptId: receipt.receiptId,
          imageUrl: await this.getReceiptPresignedUrl(receipt.imageUrl),
        })),
      ),
    };
  }

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto,
    receiptImage?: ReceiptImageFile,
  ) {
    await this.ensureActiveWallet(
      createTransactionDto.walletId,
      userId,
      'Wallet not found or inactive',
    );

    let categoryId: string | null;
    if (createTransactionDto.type === TransactionType.TRANSFER) {
      categoryId = await this.resolveCategoryIdForTransaction(
        createTransactionDto.type,
        createTransactionDto.categoryId,
        userId,
      );
    } else {
      if (createTransactionDto.categoryId == null) {
        throw new BadRequestException('Category is required');
      }
      categoryId = createTransactionDto.categoryId;
      const categoryType = await this.getCategoryType(categoryId, userId);
      this.validateTransactionCategoryType(
        createTransactionDto.type,
        categoryType,
      );
    }

    const toWalletId = await this.resolveTransferDestinationWalletId(
      createTransactionDto.type,
      createTransactionDto.walletId,
      createTransactionDto.toWalletId,
      userId,
    );

    if (createTransactionDto.aiSuggestedCategoryId !== undefined) {
      const aiSuggestedCategory = await this.prisma.category.findFirst({
        where: {
          categoryId: createTransactionDto.aiSuggestedCategoryId,
          userId,
          status: 'ACTIVE',
        },
        select: {
          categoryId: true,
        },
      });

      if (!aiSuggestedCategory) {
        throw new NotFoundException('AI suggested category not found');
      }
    }

    const amount = new Prisma.Decimal(createTransactionDto.amount);
    const transactionId = uuidv4();
    const receiptImages = receiptImage ? [receiptImage] : [];
    this.validateReceiptImageFiles(receiptImages);

    const preparedReceipts = this.prepareReceiptUploads(userId, receiptImages);
    let storedReceipts: StoredReceiptUpload[] = [];

    try {
      if (preparedReceipts.length > 0) {
        storedReceipts = await this.uploadPreparedReceipts(preparedReceipts);
      }

      const createdTransaction = await this.prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            transactionId,
            userId,
            walletId: createTransactionDto.walletId,
            toWalletId,
            categoryId,
            amount,
            type: createTransactionDto.type,
            transactionDate: createTransactionDto.transactionDate
              ? new Date(createTransactionDto.transactionDate)
              : new Date(),
            notes: createTransactionDto.notes,
            isExcludedFromReport: createTransactionDto.isExcludedFromReport,
            aiSuggestedCategoryId: createTransactionDto.aiSuggestedCategoryId,
            isEssential: createTransactionDto.isEssential,
            createdAt: new Date(),
          },
        });

        const receiptIds = await this.createReceiptRecords(
          tx,
          userId,
          transactionId,
          storedReceipts,
        );

        await this.applyWalletBalanceDeltas(
          tx,
          userId,
          this.getWalletBalanceDeltas(
            createTransactionDto.type,
            createTransactionDto.walletId,
            toWalletId,
            amount,
          ),
        );

        return {
          transaction: await this.getTransactionSummaryOrThrow(
            tx,
            transactionId,
          ),
          receiptIds,
        };
      });

      await this.enqueueReceiptProcessing(createdTransaction.receiptIds);
      return createdTransaction.transaction;
    } catch (error) {
      await this.deleteUploadedReceipts(
        storedReceipts.map((receipt) => receipt.key),
      );
      throw error;
    }
  }

  async update(
    id: string,
    userId: string,
    updateTransactionDto: UpdateTransactionDto,
    receiptImages: ReceiptImageFile[] = [],
  ) {
    this.validateReceiptImageFiles(receiptImages);
    this.validateUpdatePayloadHasChanges(updateTransactionDto, receiptImages);

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        transactionId: id,
        userId,
        deletedAt: null,
      },
      select: {
        transactionId: true,
        userId: true,
        walletId: true,
        toWalletId: true,
        categoryId: true,
        amount: true,
        type: true,
        receipts: {
          select: receiptMutationSelect,
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const replaceReceiptImages =
      updateTransactionDto.replaceReceiptImages ?? false;
    this.validateReceiptMutation(
      transaction.receipts.length,
      receiptImages.length,
      replaceReceiptImages,
    );

    const nextType = updateTransactionDto.type ?? transaction.type;
    const nextWalletId = updateTransactionDto.walletId ?? transaction.walletId;
    const nextAmount =
      updateTransactionDto.amount !== undefined
        ? new Prisma.Decimal(updateTransactionDto.amount)
        : transaction.amount;

    if (updateTransactionDto.walletId !== undefined) {
      await this.ensureActiveWallet(
        updateTransactionDto.walletId,
        userId,
        'Wallet not found or inactive',
      );
    }

    const nextCategoryId = await this.resolveCategoryIdForTransaction(
      nextType,
      nextType === TransactionType.TRANSFER
        ? updateTransactionDto.categoryId
        : (updateTransactionDto.categoryId ?? transaction.categoryId),
      userId,
    );

    const categoryType = await this.getCategoryType(nextCategoryId, userId);
    this.validateTransactionCategoryType(nextType, categoryType);

    const nextToWalletId = await this.resolveTransferDestinationWalletId(
      nextType,
      nextWalletId,
      nextType === TransactionType.TRANSFER
        ? (updateTransactionDto.toWalletId ?? transaction.toWalletId)
        : updateTransactionDto.toWalletId,
      userId,
    );

    const preparedReceipts = this.prepareReceiptUploads(userId, receiptImages);
    let storedReceipts: StoredReceiptUpload[] = [];

    try {
      if (preparedReceipts.length > 0) {
        storedReceipts = await this.uploadPreparedReceipts(preparedReceipts);
      }

      const updatedTransaction = await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: {
            transactionId: id,
          },
          data: {
            walletId: updateTransactionDto.walletId,
            toWalletId: nextToWalletId,
            categoryId: nextCategoryId,
            amount:
              updateTransactionDto.amount !== undefined
                ? nextAmount
                : undefined,
            type: updateTransactionDto.type,
            transactionDate:
              updateTransactionDto.transactionDate !== undefined
                ? new Date(updateTransactionDto.transactionDate)
                : undefined,
            notes: updateTransactionDto.notes,
            isExcludedFromReport: updateTransactionDto.isExcludedFromReport,
            isEssential: updateTransactionDto.isEssential,
          },
        });

        if (replaceReceiptImages) {
          await tx.receipt.deleteMany({
            where: {
              transactionId: id,
              userId,
            },
          });
        }

        const receiptIds = await this.createReceiptRecords(
          tx,
          userId,
          id,
          storedReceipts,
        );

        await this.applyWalletBalanceDeltas(
          tx,
          userId,
          this.getWalletBalanceDeltas(
            transaction.type,
            transaction.walletId,
            transaction.toWalletId,
            transaction.amount,
          ),
          true,
        );
        await this.applyWalletBalanceDeltas(
          tx,
          userId,
          this.getWalletBalanceDeltas(
            nextType,
            nextWalletId,
            nextToWalletId,
            nextAmount,
          ),
        );

        return {
          transaction: await this.getTransactionSummaryOrThrow(tx, id),
          receiptIds,
        };
      });

      if (replaceReceiptImages) {
        await this.deleteUploadedReceipts(
          transaction.receipts
            .map((receipt) =>
              this.s3Service.getObjectKeyFromUrl(receipt.imageUrl),
            )
            .filter((key): key is string => key !== null),
        );
      }

      await this.enqueueReceiptProcessing(updatedTransaction.receiptIds);
      return updatedTransaction.transaction;
    } catch (error) {
      await this.deleteUploadedReceipts(
        storedReceipts.map((receipt) => receipt.key),
      );
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        transactionId: id,
        userId,
        deletedAt: null,
      },
      select: {
        transactionId: true,
        walletId: true,
        toWalletId: true,
        amount: true,
        type: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { transactionId: id },
        data: { deletedAt: new Date() },
      });

      await this.applyWalletBalanceDeltas(
        tx,
        userId,
        this.getWalletBalanceDeltas(
          transaction.type,
          transaction.walletId,
          transaction.toWalletId,
          transaction.amount,
        ),
        true,
      );
    });

    return { message: 'Transaction deleted successfully', transactionId: id };
  }

  private validateTransactionCategoryType(
    transactionType: TransactionType,
    categoryType: CategoryType | null,
  ) {
    if (transactionType === TransactionType.TRANSFER) {
      return;
    }

    if (!categoryType) {
      throw new BadRequestException(
        'Category is required for this transaction',
      );
    }

    const expectedCategoryType =
      transactionType === TransactionType.INCOME
        ? CategoryType.INCOME
        : CategoryType.EXPENSE;

    if (categoryType !== expectedCategoryType) {
      throw new BadRequestException(
        'Transaction type does not match category type',
      );
    }
  }

  private validateUpdatePayloadHasChanges(
    updateTransactionDto: UpdateTransactionDto,
    receiptImages: ReceiptImageFile[],
  ) {
    const updateableFields: Array<keyof UpdateTransactionDto> = [
      'walletId',
      'toWalletId',
      'categoryId',
      'amount',
      'type',
      'transactionDate',
      'notes',
      'isExcludedFromReport',
      'isEssential',
      'replaceReceiptImages',
    ];

    const hasFieldChanges = updateableFields.some(
      (field) => updateTransactionDto[field] !== undefined,
    );

    if (!hasFieldChanges && receiptImages.length === 0) {
      throw new BadRequestException('No transaction fields provided to update');
    }
  }

  private validateReceiptMutation(
    existingReceiptCount: number,
    uploadedReceiptCount: number,
    replaceReceiptImages: boolean,
  ) {
    if (replaceReceiptImages && uploadedReceiptCount === 0) {
      throw new BadRequestException(
        'receiptImage is required when replaceReceiptImages is true',
      );
    }

    const nextReceiptCount = replaceReceiptImages
      ? uploadedReceiptCount
      : existingReceiptCount + uploadedReceiptCount;

    if (nextReceiptCount > MAX_RECEIPT_IMAGES_PER_TRANSACTION) {
      throw new BadRequestException(
        `A transaction can have at most ${MAX_RECEIPT_IMAGES_PER_TRANSACTION} receipt images`,
      );
    }
  }

  private validateReceiptImageFiles(receiptImages: ReceiptImageFile[]) {
    for (const receiptImage of receiptImages) {
      if (!ALLOWED_RECEIPT_IMAGE_MIME_TYPES.has(receiptImage.mimetype)) {
        throw new BadRequestException('Unsupported receipt image type');
      }

      if (receiptImage.size > MAX_RECEIPT_IMAGE_SIZE_BYTES) {
        throw new BadRequestException('Receipt image must be 5MB or smaller');
      }
    }
  }

  private async ensureActiveWallet(
    walletId: string,
    userId: string,
    errorMessage: string,
  ) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        walletId,
        userId,
        isActive: true,
      },
      select: {
        walletId: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException(errorMessage);
    }
  }

  private async resolveCategoryIdForTransaction(
    transactionType: TransactionType,
    categoryId: string | undefined | null,
    userId: string,
  ) {
    if (transactionType === TransactionType.TRANSFER) {
      if (categoryId !== undefined && categoryId !== null) {
        throw new BadRequestException(
          'Transfer transactions must not have category',
        );
      }

      return null;
    }

    if (categoryId === undefined || categoryId === null) {
      throw new BadRequestException(
        'Category is required for this transaction',
      );
    }

    await this.getCategoryType(categoryId, userId);

    return categoryId;
  }

  private async getCategoryType(
    categoryId: string | null,
    userId: string,
  ): Promise<CategoryType | null> {
    if (categoryId === null) {
      return null;
    }

    const category = await this.prisma.category.findFirst({
      where: {
        categoryId,
        userId,
        status: 'ACTIVE',
      },
      select: {
        type: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found or inactive');
    }

    return category.type;
  }

  private async resolveTransferDestinationWalletId(
    transactionType: TransactionType,
    walletId: string,
    toWalletId: string | undefined | null,
    userId: string,
  ) {
    if (transactionType !== TransactionType.TRANSFER) {
      if (toWalletId !== undefined && toWalletId !== null) {
        throw new BadRequestException(
          'toWalletId is only allowed for transfer transactions',
        );
      }

      return null;
    }

    if (toWalletId === undefined || toWalletId === null) {
      throw new BadRequestException(
        'toWalletId is required for transfer transactions',
      );
    }

    if (toWalletId === walletId) {
      throw new BadRequestException(
        'Transfer destination wallet must be different from source wallet',
      );
    }

    await this.ensureActiveWallet(
      toWalletId,
      userId,
      'Destination wallet not found or inactive',
    );

    return toWalletId;
  }

  private getWalletBalanceDeltas(
    transactionType: TransactionType,
    walletId: string,
    toWalletId: string | null | undefined,
    amount: Prisma.Decimal.Value,
  ) {
    const decimalAmount = new Prisma.Decimal(amount);

    switch (transactionType) {
      case TransactionType.INCOME:
        return [{ walletId, delta: decimalAmount }];
      case TransactionType.EXPENSE:
        return [{ walletId, delta: decimalAmount.neg() }];
      case TransactionType.TRANSFER:
        if (toWalletId === undefined || toWalletId === null) {
          throw new BadRequestException(
            'toWalletId is required for transfer transactions',
          );
        }

        return [
          { walletId, delta: decimalAmount.neg() },
          { walletId: toWalletId, delta: decimalAmount },
        ];
    }
  }

  private async applyWalletBalanceDeltas(
    tx: Prisma.TransactionClient,
    userId: string,
    deltas: Array<{ walletId: string; delta: Prisma.Decimal }>,
    reverse = false,
  ) {
    for (const { walletId, delta } of deltas) {
      await this.applyWalletBalanceDelta(
        tx,
        walletId,
        userId,
        reverse ? delta.neg() : delta,
      );
    }
  }

  private async applyWalletBalanceDelta(
    tx: Prisma.TransactionClient,
    walletId: string,
    userId: string,
    delta: Prisma.Decimal,
  ) {
    if (delta.isZero()) {
      return;
    }

    const result = await tx.wallet.updateMany({
      where: {
        walletId,
        userId,
      },
      data: {
        balance: {
          increment: delta,
        },
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Wallet not found');
    }
  }

  private async getTransactionSummaryOrThrow(
    tx: Prisma.TransactionClient,
    transactionId: string,
  ) {
    const transaction = await tx.transaction.findUnique({
      where: {
        transactionId,
      },
      select: transactionSummarySelect,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private async getReceiptPresignedUrl(imageUrl: string) {
    const objectKey = this.s3Service.getObjectKeyFromUrl(imageUrl);

    if (!objectKey) {
      throw new NotFoundException('Receipt image not found');
    }

    return this.s3Service.getPresignedObjectUrl(objectKey);
  }

  private prepareReceiptUploads(
    userId: string,
    receiptImages: ReceiptImageFile[],
  ): PreparedReceiptUpload[] {
    return receiptImages.map((receiptImage) => {
      const receiptId = uuidv4();

      return {
        receiptId,
        key: this.buildReceiptObjectKey(userId, receiptId),
        body: receiptImage.buffer,
        contentType: receiptImage.mimetype,
      };
    });
  }

  private async uploadPreparedReceipts(
    preparedReceipts: PreparedReceiptUpload[],
  ) {
    return Promise.all(
      preparedReceipts.map(async (receipt) => {
        const uploadedObject = await this.s3Service.uploadObject({
          key: receipt.key,
          body: receipt.body,
          contentType: receipt.contentType,
        });

        return {
          ...receipt,
          url: uploadedObject.url,
        };
      }),
    );
  }

  private async createReceiptRecords(
    tx: Prisma.TransactionClient,
    userId: string,
    transactionId: string,
    storedReceipts: StoredReceiptUpload[],
  ) {
    const createdReceipts = await Promise.all(
      storedReceipts.map((receipt) =>
        tx.receipt.create({
          data: {
            receiptId: receipt.receiptId,
            userId,
            transactionId,
            imageUrl: receipt.url,
          },
          select: {
            receiptId: true,
          },
        }),
      ),
    );

    return createdReceipts.map((receipt) => receipt.receiptId);
  }

  private async enqueueReceiptProcessing(receiptIds: string[]) {
    if (receiptIds.length === 0) {
      return;
    }

    try {
      await this.receiptProcessingQueue.enqueueMany(receiptIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue receipt processing for ${receiptIds.join(', ')}: ${message}`,
      );
    }
  }

  private buildReceiptObjectKey(userId: string, receiptId: string) {
    return [userId, receiptId].join('/');
  }

  private async deleteUploadedReceipts(keys: string[]) {
    await Promise.all(keys.map((key) => this.deleteUploadedReceipt(key)));
  }

  private async deleteUploadedReceipt(key: string) {
    try {
      await this.s3Service.deleteObject(key);
    } catch {
      // Best-effort cleanup; original transaction error is more useful.
    }
  }
}
