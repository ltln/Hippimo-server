import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TransactionType } from 'src/core/prisma/prisma.client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Source wallet UUID.',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsNotEmpty()
  walletId!: string;

  @ApiPropertyOptional({
    description: 'Category UUID. Required for income and expense transactions.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Destination wallet UUID. Required for transfer transactions.',
    example: '0fd436a9-d862-47a6-9ffe-5fc2efb76b91',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsOptional()
  toWalletId?: string;

  @ApiProperty({
    description: 'Transaction amount. Must be greater than 0.',
    example: 150000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({
    description: 'Transaction type.',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type!: TransactionType;

  @ApiPropertyOptional({
    description:
      'Date and time when the transaction happened. Defaults to current time when omitted.',
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
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Exclude this transaction from reports.',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isExcludedFromReport?: boolean;

  @ApiPropertyOptional({
    description: 'AI suggested category UUID, if available.',
    example: '589f7252-dca3-487b-b168-fbc62f79504b',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsOptional()
  aiSuggestedCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Marks expense as essential spending.',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isEssential?: boolean;

  @ApiPropertyOptional({
    description: 'Optional receipt image. Supports jpeg, png, webp, gif.',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  receiptImage?: unknown;
}
