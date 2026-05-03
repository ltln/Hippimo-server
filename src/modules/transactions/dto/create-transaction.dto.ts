import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransactionType } from 'src/core/prisma/prisma.client';

export class CreateTransactionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  userId!: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  walletId!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  toWalletId?: number;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type!: TransactionType;

  @IsDateString()
  @IsNotEmpty()
  transactionDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isExcludedFromReport?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  aiSuggestedCategoryId?: number;

  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}
