import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TransactionType } from 'src/core/prisma/prisma.client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTransactionDto {
  @ApiPropertyOptional({
    description: 'Source wallet UUID.',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  walletId?: string;

  @ApiPropertyOptional({
    description:
      'Category UUID. Required when final type is income or expense.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Destination wallet UUID. Required when final type is transfer.',
    example: '0fd436a9-d862-47a6-9ffe-5fc2efb76b91',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  toWalletId?: string;

  @ApiPropertyOptional({
    description: 'Transaction amount. Must be greater than 0.',
    example: 150000,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Transaction type.',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Date and time when the transaction happened.',
    example: '2026-05-24T10:30:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @ApiPropertyOptional({
    description: 'Optional transaction note.',
    example: 'Lunch with client',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Exclude this transaction from reports.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isExcludedFromReport?: boolean;

  @ApiPropertyOptional({
    description: 'Marks expense as essential spending.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}
