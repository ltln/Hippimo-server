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
import { Transform, Type } from 'class-transformer';

const transformBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value;
};

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
  @Type(() => Number)
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
  @Transform(transformBoolean)
  @IsBoolean()
  isExcludedFromReport?: boolean;

  @ApiPropertyOptional({
    description: 'Marks expense as essential spending.',
    example: true,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isEssential?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional receipt image upload. Multiple files can be appended on update, up to 5 total per transaction.',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  receiptImage?: unknown;

  @ApiPropertyOptional({
    description:
      'Replace existing receipt images with the uploaded files instead of appending them.',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  replaceReceiptImages?: boolean;
}
