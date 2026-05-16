import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BudgetPeriodType } from 'src/core/prisma/prisma.client';

export class CreateBudgetDto {
  @IsUUID('4')
  @IsNotEmpty()
  categoryId!: string;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amountLimit!: number;

  @IsEnum(BudgetPeriodType)
  @IsNotEmpty()
  periodType!: BudgetPeriodType;

  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
