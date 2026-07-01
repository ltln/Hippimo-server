import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  Patch,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  type ReceiptImageFile,
  TransactionsService,
} from './transactions.service';
import {
  MAX_RECEIPT_IMAGE_SIZE_BYTES,
  RECEIPT_IMAGE_UPLOAD_LIMITS,
} from './receipt-upload.constants';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UserId } from 'src/core/common/decorators/user-id.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  TransactionDetail,
  TransactionSummary,
} from './entities/transaction.entity';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a transaction for current user',
    description:
      'Creates an income, expense, or transfer transaction, optionally uploads a receipt image, and applies wallet balance changes.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['walletId', 'amount', 'type'],
      properties: {
        walletId: { type: 'string', format: 'uuid' },
        categoryId: { type: 'string', format: 'uuid' },
        toWalletId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0.01 },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        transactionDate: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
        isExcludedFromReport: { type: 'boolean' },
        aiSuggestedCategoryId: { type: 'string', format: 'uuid' },
        isEssential: { type: 'boolean' },
        receiptImage: {
          type: 'string',
          format: 'binary',
          description:
            'Optional receipt image up to 10MB. Supports jpeg, png, webp, gif.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Transaction created successfully.',
    type: TransactionSummary,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid transaction payload, missing required category or destination wallet, or incompatible category type.',
  })
  @ApiNotFoundResponse({
    description: 'Wallet, category, or AI suggested category was not found.',
  })
  @UseInterceptors(
    FileInterceptor('receiptImage', {
      limits: RECEIPT_IMAGE_UPLOAD_LIMITS,
    }),
  )
  create(
    @UserId() userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_RECEIPT_IMAGE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    receiptImage?: ReceiptImageFile,
  ) {
    return this.transactionsService.create(
      userId,
      createTransactionDto,
      receiptImage,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List transactions for current user' })
  @ApiOkResponse({
    description: 'Transactions returned successfully.',
    type: TransactionSummary,
    isArray: true,
  })
  findAll(@UserId() userId: string) {
    return this.transactionsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by id' })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction returned successfully.',
    type: TransactionDetail,
  })
  @ApiNotFoundResponse({ description: 'Transaction not found.' })
  findOne(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a transaction by id',
    description:
      'Updates transaction fields, can append or replace receipt images, and reapplies wallet balance changes when amount, type, or wallets change.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        walletId: { type: 'string', format: 'uuid' },
        categoryId: { type: 'string', format: 'uuid' },
        toWalletId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0.01 },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        transactionDate: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
        isExcludedFromReport: { type: 'boolean' },
        isEssential: { type: 'boolean' },
        replaceReceiptImages: { type: 'boolean', default: false },
        receiptImage: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Optional receipt images up to 10MB each. Appends by default or replaces all existing images when replaceReceiptImages is true. Maximum 5 images total per transaction.',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction updated successfully.',
    type: TransactionSummary,
  })
  @ApiBadRequestResponse({
    description:
      'No fields provided, invalid receipt upload, too many receipt images, or incompatible category/type/wallet combination.',
  })
  @ApiNotFoundResponse({
    description: 'Transaction, wallet, or category not found.',
  })
  @UseInterceptors(
    FilesInterceptor('receiptImage', 5, {
      limits: RECEIPT_IMAGE_UPLOAD_LIMITS,
    }),
  )
  update(
    @Param('id', uuidPipe) id: string,
    @UserId() userId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @UploadedFiles() receiptImages?: ReceiptImageFile[],
  ) {
    return this.transactionsService.update(
      id,
      userId,
      updateTransactionDto,
      receiptImages,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction by id' })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID.',
    format: 'uuid',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
  })
  @ApiOkResponse({
    description: 'Transaction deleted successfully.',
    schema: {
      example: {
        message: 'Transaction deleted successfully',
        transactionId: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Transaction not found.' })
  remove(@Param('id', uuidPipe) id: string, @UserId() userId: string) {
    return this.transactionsService.remove(id, userId);
  }
}
