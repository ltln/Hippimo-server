import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BudgetPeriodType } from 'src/core/prisma/prisma.client';

export class ListBudgetsDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsEnum(BudgetPeriodType)
  periodType?: BudgetPeriodType;

  @IsOptional()
  @IsDateString()
  periodStart?: string;
}
