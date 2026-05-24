import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriodType } from 'src/core/prisma/prisma.client';

export class Budget {
  @ApiProperty({
    description: 'Budget UUID.',
    example: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
    format: 'uuid',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Owner user UUID.',
    example: 'ffbd5f5e-263a-45db-9d83-e762a11d8c9b',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'Expense category UUID assigned to this budget.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Budget amount limit as a decimal string.',
    example: '3000000.00',
  })
  amountLimit!: string;

  @ApiProperty({
    description: 'Budget period type.',
    enum: BudgetPeriodType,
    example: BudgetPeriodType.MONTH,
  })
  periodType!: BudgetPeriodType;

  @ApiProperty({
    description: 'Budget period start date.',
    example: '2026-05-01T00:00:00.000Z',
    format: 'date-time',
  })
  periodStart!: Date;

  @ApiProperty({
    description: 'Budget period end date.',
    example: '2026-05-30T23:59:59.999Z',
    format: 'date-time',
  })
  periodEnd!: Date;

  @ApiProperty({
    description: 'Usage threshold percent that triggers an alert.',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  alertThresholdPercent!: number;

  @ApiProperty({
    description: 'Spent amount in this budget period as a decimal string.',
    example: '1250000.00',
  })
  spentAmount!: string;

  @ApiProperty({
    description: 'Remaining amount in this budget period as a decimal string.',
    example: '1750000.00',
  })
  remainingAmount!: string;

  @ApiProperty({
    description: 'Current usage percentage for this budget.',
    example: 41.67,
  })
  usagePercent!: number;

  @ApiProperty({
    description: 'Whether current usage reached the alert threshold.',
    example: false,
  })
  overThreshold!: boolean;

  @ApiPropertyOptional({
    description: 'Alert message when usage reaches the threshold.',
    example: 'Budget usage exceeded 80%',
    nullable: true,
  })
  alertMessage?: string | null;
}
