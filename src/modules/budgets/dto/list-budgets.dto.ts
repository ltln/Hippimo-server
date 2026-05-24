import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BudgetPeriodType } from 'src/core/prisma/prisma.client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBudgetsDto {
  @ApiPropertyOptional({
    description: 'Filter by expense category UUID.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by budget period type.',
    enum: BudgetPeriodType,
    example: BudgetPeriodType.MONTH,
  })
  @IsOptional()
  @IsEnum(BudgetPeriodType)
  periodType?: BudgetPeriodType;

  @ApiPropertyOptional({
    description: 'Filter by exact budget period start date.',
    example: '2026-05-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  periodStart?: string;
}
