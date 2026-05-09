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

export class CreateTransactionDto {
  @IsUUID('4')
  @IsNotEmpty()
  walletId!: string;

  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @IsUUID('4')
  @IsOptional()
  toWalletId?: string;

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

  @IsUUID('4')
  @IsOptional()
  aiSuggestedCategoryId?: string;

  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}
