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

export class UpdateTransactionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  userId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  walletId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  toWalletId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isExcludedFromReport?: boolean;

  @IsOptional()
  @IsBoolean()
  isEssential?: boolean;
}
