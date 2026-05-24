import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BudgetPeriodType } from 'src/core/prisma/prisma.client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @ApiPropertyOptional({
    description: 'Expense category UUID assigned to this budget.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Budget amount limit. Must be greater than 0.',
    example: 3000000,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountLimit?: number;

  @ApiPropertyOptional({
    description: 'Budget period type.',
    enum: BudgetPeriodType,
    example: BudgetPeriodType.MONTH,
  })
  @IsOptional()
  @IsEnum(BudgetPeriodType)
  periodType?: BudgetPeriodType;

  @ApiPropertyOptional({
    description: 'Budget period start date. Date-only input is accepted.',
    example: '2026-05-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'Usage threshold percent that triggers an alert.',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
