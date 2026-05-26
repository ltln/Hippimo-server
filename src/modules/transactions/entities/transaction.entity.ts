import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from 'src/core/prisma/prisma.client';

class TransactionReceiptSummary {
  @ApiProperty({
    description: 'Receipt UUID.',
    example: '8a8770fb-76c7-44e9-87bd-d54f1e986089',
    format: 'uuid',
  })
  receiptId!: string;
}

class TransactionReceiptDetail extends TransactionReceiptSummary {
  @ApiProperty({
    description: 'Time-limited presigned URL for the receipt image.',
    example:
      'https://cdn.example.com/bucket/user-id/receipt-id?X-Amz-Algorithm=AWS4-HMAC-SHA256',
  })
  imageUrl!: string;
}

export class TransactionSummary {
  @ApiProperty({
    description: 'Transaction UUID.',
    example: '4b7a85ce-5fc3-4ed2-b26f-49a3d2ed9c2d',
    format: 'uuid',
  })
  transactionId!: string;

  @ApiProperty({
    description: 'Owner user UUID.',
    example: 'ffbd5f5e-263a-45db-9d83-e762a11d8c9b',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'Source wallet UUID.',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
    format: 'uuid',
  })
  walletId!: string;

  @ApiPropertyOptional({
    description: 'Destination wallet UUID for transfer transactions.',
    example: '0fd436a9-d862-47a6-9ffe-5fc2efb76b91',
    format: 'uuid',
    nullable: true,
  })
  toWalletId?: string | null;

  @ApiPropertyOptional({
    description: 'Category UUID. Null for transfers.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
    nullable: true,
  })
  categoryId?: string | null;

  @ApiProperty({
    description: 'Transaction amount as a decimal string.',
    example: '150000.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'Transaction type.',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  type!: TransactionType;

  @ApiProperty({
    description: 'Date and time when the transaction happened.',
    example: '2026-05-24T10:30:00.000Z',
    format: 'date-time',
  })
  transactionDate!: Date;

  @ApiPropertyOptional({
    description: 'Optional transaction note.',
    example: 'Lunch with client',
    nullable: true,
  })
  notes?: string | null;

  @ApiProperty({
    description: 'Whether this transaction is excluded from reports.',
    example: false,
  })
  isExcludedFromReport!: boolean;

  @ApiPropertyOptional({
    description: 'AI suggested category UUID, if available.',
    example: '589f7252-dca3-487b-b168-fbc62f79504b',
    format: 'uuid',
    nullable: true,
  })
  aiSuggestedCategoryId?: string | null;

  @ApiProperty({
    description: 'Whether this transaction is essential spending.',
    example: true,
  })
  isEssential!: boolean;

  @ApiProperty({
    description: 'Date and time when this transaction was created.',
    example: '2026-05-24T10:35:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Receipt identifiers attached to this transaction.',
    type: TransactionReceiptSummary,
    isArray: true,
  })
  receipts?: TransactionReceiptSummary[];
}

export class TransactionDetail extends TransactionSummary {
  @ApiPropertyOptional({
    description:
      'Receipts attached to this transaction, with a presigned image URL.',
    type: TransactionReceiptDetail,
    isArray: true,
  })
  declare receipts?: TransactionReceiptDetail[];
}
