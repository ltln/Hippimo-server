import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType, WalletType } from 'src/core/prisma/prisma.client';

export class StatisticsPeriod {
  @ApiProperty({
    description: 'Start date (inclusive) of the statistics period.',
    example: '2026-06-01T00:00:00.000Z',
    format: 'date-time',
  })
  from!: Date;

  @ApiProperty({
    description: 'End date (inclusive) of the statistics period.',
    example: '2026-06-29T23:59:59.999Z',
    format: 'date-time',
  })
  to!: Date;
}

export class WalletBalance {
  @ApiProperty({
    description: 'Wallet UUID.',
    example: '7d6f2c2a-1c4b-4e2a-8f3a-2b1c0d9e8f7a',
    format: 'uuid',
  })
  walletId!: string;

  @ApiProperty({ description: 'Wallet name.', example: 'Cash' })
  name!: string;

  @ApiProperty({ description: 'Wallet type.', enum: WalletType })
  type!: WalletType;

  @ApiProperty({
    description: 'Current wallet balance as a decimal string.',
    example: '1500000.00',
  })
  balance!: string;
}

export class WalletSummary {
  @ApiProperty({
    description: 'Total balance across active wallets as a decimal string.',
    example: '5200000.00',
  })
  totalBalance!: string;

  @ApiProperty({ description: 'User currency code.', example: 'VND' })
  currency!: string;

  @ApiProperty({
    description: 'Per-wallet balances for active wallets.',
    type: WalletBalance,
    isArray: true,
  })
  wallets!: WalletBalance[];
}

export class CashFlowTotals {
  @ApiProperty({
    description: 'Total income in the period as a decimal string.',
    example: '8000000.00',
  })
  income!: string;

  @ApiProperty({
    description: 'Total expense in the period as a decimal string.',
    example: '3200000.00',
  })
  expense!: string;

  @ApiProperty({
    description: 'Net amount (income - expense) as a decimal string.',
    example: '4800000.00',
  })
  net!: string;
}

export class CashFlowSummary extends CashFlowTotals {
  @ApiProperty({
    description: 'Cash flow totals for the immediately preceding period.',
    type: CashFlowTotals,
  })
  previous!: CashFlowTotals;
}

export class ExpenseByCategory {
  @ApiProperty({
    description: 'Category UUID.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({ description: 'Category name.', example: 'Food & Drink' })
  name!: string;

  @ApiProperty({ description: 'Category type.', enum: CategoryType })
  type!: CategoryType;

  @ApiPropertyOptional({
    description: 'Category icon.',
    example: 'restaurant',
    nullable: true,
  })
  icon?: string | null;

  @ApiPropertyOptional({
    description: 'Category color.',
    example: '#FF7043',
    nullable: true,
  })
  color?: string | null;

  @ApiProperty({
    description: 'Total expense for this category as a decimal string.',
    example: '1200000.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'Percentage of total expense for this category.',
    example: 37.5,
  })
  percent!: number;
}

export class BudgetAlert {
  @ApiProperty({
    description: 'Budget UUID.',
    example: 'ea235716-98e9-4c2f-99f4-1f7c906dd934',
    format: 'uuid',
  })
  budgetId!: string;

  @ApiProperty({
    description: 'Expense category UUID assigned to the budget.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({ description: 'Category name.', example: 'Food & Drink' })
  categoryName!: string;

  @ApiProperty({
    description: 'Budget amount limit as a decimal string.',
    example: '3000000.00',
  })
  amountLimit!: string;

  @ApiProperty({
    description: 'Spent amount in the budget period as a decimal string.',
    example: '2700000.00',
  })
  spentAmount!: string;

  @ApiProperty({
    description: 'Current usage percentage for the budget.',
    example: 90,
  })
  usagePercent!: number;

  @ApiProperty({
    description: 'Usage threshold percent that triggers an alert.',
    example: 80,
  })
  alertThresholdPercent!: number;
}

export class HomeStatistics {
  @ApiProperty({
    description: 'Resolved statistics period.',
    type: StatisticsPeriod,
  })
  period!: StatisticsPeriod;

  @ApiProperty({
    description: 'Wallet balances summary.',
    type: WalletSummary,
  })
  walletSummary!: WalletSummary;

  @ApiProperty({
    description: 'Income and expense summary for the period.',
    type: CashFlowSummary,
  })
  cashFlow!: CashFlowSummary;

  @ApiProperty({
    description: 'Expense breakdown by category, sorted by amount descending.',
    type: ExpenseByCategory,
    isArray: true,
  })
  expenseByCategory!: ExpenseByCategory[];

  @ApiProperty({
    description:
      'Budgets overlapping the period that reached their alert threshold.',
    type: BudgetAlert,
    isArray: true,
  })
  budgetAlerts!: BudgetAlert[];
}
