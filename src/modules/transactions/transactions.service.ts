import {
  BadRequestException,
  Injectable,
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

const transactionSelect = {
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
} as const;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: number) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: transactionSelect,
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  async findOne(id: number, userId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        transactionId: id,
        userId,
        deletedAt: null,
      },
      select: transactionSelect,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async create(createTransactionDto: CreateTransactionDto) {
    const userId = createTransactionDto.userId;

    await this.ensureActiveWallet(
      createTransactionDto.walletId,
      userId,
      'Wallet not found or inactive',
    );

    let categoryId: number | null;
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

    return this.prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          userId,
          walletId: createTransactionDto.walletId,
          toWalletId,
          categoryId,
          amount,
          type: createTransactionDto.type,
          transactionDate: new Date(createTransactionDto.transactionDate),
          notes: createTransactionDto.notes,
          isExcludedFromReport: createTransactionDto.isExcludedFromReport,
          aiSuggestedCategoryId: createTransactionDto.aiSuggestedCategoryId,
          isEssential: createTransactionDto.isEssential,
          createdAt: new Date(),
        },
        select: transactionSelect,
      });

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

      return createdTransaction;
    });
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    const userId = updateTransactionDto.userId;
    this.validateUpdatePayloadHasChanges(updateTransactionDto);

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
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

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

    return this.prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transaction.update({
        where: {
          transactionId: id,
        },
        data: {
          walletId: updateTransactionDto.walletId,
          toWalletId: nextToWalletId,
          categoryId: nextCategoryId,
          amount:
            updateTransactionDto.amount !== undefined ? nextAmount : undefined,
          type: updateTransactionDto.type,
          transactionDate:
            updateTransactionDto.transactionDate !== undefined
              ? new Date(updateTransactionDto.transactionDate)
              : undefined,
          notes: updateTransactionDto.notes,
          isExcludedFromReport: updateTransactionDto.isExcludedFromReport,
          isEssential: updateTransactionDto.isEssential,
        },
        select: transactionSelect,
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

      return updatedTransaction;
    });
  }

  async remove(id: number, userId: number) {
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
    ];

    const hasChanges = updateableFields.some(
      (field) => updateTransactionDto[field] !== undefined,
    );

    if (!hasChanges) {
      throw new BadRequestException('No transaction fields provided to update');
    }
  }

  private async ensureActiveWallet(
    walletId: number,
    userId: number,
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
    categoryId: number | undefined | null,
    userId: number,
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
    categoryId: number | null,
    userId: number,
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
    walletId: number,
    toWalletId: number | undefined | null,
    userId: number,
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
    walletId: number,
    toWalletId: number | null | undefined,
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
    userId: number,
    deltas: Array<{ walletId: number; delta: Prisma.Decimal }>,
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
    walletId: number,
    userId: number,
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
}
