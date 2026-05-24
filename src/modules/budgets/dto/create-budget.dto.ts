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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Expense category UUID assigned to this budget.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  @IsUUID('4')
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({
    description: 'Budget amount limit. Must be greater than 0.',
    example: 3000000,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amountLimit!: number;

  @ApiProperty({
    description: 'Budget period type.',
    enum: BudgetPeriodType,
    example: BudgetPeriodType.MONTH,
  })
  @IsEnum(BudgetPeriodType)
  @IsNotEmpty()
  periodType!: BudgetPeriodType;

  @ApiProperty({
    description: 'Budget period start date. Date-only input is accepted.',
    example: '2026-05-01',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @ApiPropertyOptional({
    description: 'Usage threshold percent that triggers an alert.',
    example: 80,
    minimum: 1,
    maximum: 100,
    default: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
