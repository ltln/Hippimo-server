import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { Prisma, TransactionType } from 'src/core/prisma/prisma.client';
import { HomeStatisticsQueryDto } from './dto/home-statistics-query.dto';

type PeriodRange = {
  from: Date;
  to: Date;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeStatistics(userId: string, query: HomeStatisticsQueryDto) {
    const period = this.resolvePeriod(query.from, query.to);
    const previousPeriod = this.resolvePreviousPeriod(period);

    const [walletSummary, cashFlow, previousCashFlow, expenseByCategory] =
      await Promise.all([
        this.buildWalletSummary(userId),
        this.calculateCashFlow(userId, period),
        this.calculateCashFlow(userId, previousPeriod),
        this.buildExpenseByCategory(userId, period),
      ]);

    const budgetAlerts = await this.buildBudgetAlerts(userId, period);

    return {
      period,
      walletSummary,
      cashFlow: {
        ...cashFlow,
        previous: previousCashFlow,
      },
      expenseByCategory,
      budgetAlerts,
    };
  }

  private async buildWalletSummary(userId: string) {
    const [user, wallets] = await Promise.all([
      this.prisma.user.findUnique({
        where: { userId },
        select: { currency: true },
      }),
      this.prisma.wallet.findMany({
        where: { userId, isActive: true },
        select: {
          walletId: true,
          name: true,
          type: true,
          balance: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalBalance = wallets.reduce(
      (sum, wallet) => sum.plus(wallet.balance),
      new Prisma.Decimal(0),
    );

    return {
      totalBalance,
      currency: user?.currency ?? 'VND',
      wallets,
    };
  }

  private async calculateCashFlow(userId: string, period: PeriodRange) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        deletedAt: null,
        isExcludedFromReport: false,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        transactionDate: {
          gte: period.from,
          lte: period.to,
        },
      },
      _sum: { amount: true },
    });

    const income =
      grouped.find((row) => row.type === TransactionType.INCOME)?._sum.amount ??
      new Prisma.Decimal(0);
    const expense =
      grouped.find((row) => row.type === TransactionType.EXPENSE)?._sum
        .amount ?? new Prisma.Decimal(0);

    return {
      income,
      expense,
      net: income.minus(expense),
    };
  }

  private async buildExpenseByCategory(userId: string, period: PeriodRange) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        deletedAt: null,
        isExcludedFromReport: false,
        type: TransactionType.EXPENSE,
        categoryId: { not: null },
        transactionDate: {
          gte: period.from,
          lte: period.to,
        },
      },
      _sum: { amount: true },
    });

    if (grouped.length === 0) {
      return [];
    }

    const categoryIds = grouped
      .map((row) => row.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { categoryId: { in: categoryIds }, userId },
      select: {
        categoryId: true,
        name: true,
        type: true,
        icon: true,
        color: true,
      },
    });
    const categoryById = new Map(
      categories.map((category) => [category.categoryId, category]),
    );

    const totalExpense = grouped.reduce(
      (sum, row) => sum.plus(row._sum.amount ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    return grouped
      .map((row) => {
        const category = categoryById.get(row.categoryId as string);
        const amount = row._sum.amount ?? new Prisma.Decimal(0);
        const percent = totalExpense.equals(0)
          ? 0
          : amount.dividedBy(totalExpense).times(100).toNumber();

        return {
          categoryId: row.categoryId as string,
          name: category?.name ?? 'Unknown',
          type: category?.type ?? null,
          icon: category?.icon ?? null,
          color: category?.color ?? null,
          amount,
          percent,
        };
      })
      .sort((a, b) => b.amount.comparedTo(a.amount));
  }

  private async buildBudgetAlerts(userId: string, period: PeriodRange) {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        periodStart: { lte: period.to },
        periodEnd: { gte: period.from },
      },
      select: {
        budgetId: true,
        categoryId: true,
        amountLimit: true,
        periodStart: true,
        periodEnd: true,
        alertThresholdPercent: true,
        category: {
          select: { name: true },
        },
      },
      orderBy: { periodStart: 'desc' },
    });

    if (budgets.length === 0) {
      return [];
    }

    const alerts = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: TransactionType.EXPENSE,
            deletedAt: null,
            isExcludedFromReport: false,
            transactionDate: {
              gte: budget.periodStart,
              lte: budget.periodEnd,
            },
          },
          _sum: { amount: true },
        });

        const amountLimit = new Prisma.Decimal(budget.amountLimit);
        const spentAmount = spent._sum.amount ?? new Prisma.Decimal(0);
        const usagePercent = amountLimit.equals(0)
          ? 0
          : spentAmount.dividedBy(amountLimit).times(100).toNumber();

        return {
          budgetId: budget.budgetId,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          amountLimit,
          spentAmount,
          usagePercent,
          alertThresholdPercent: budget.alertThresholdPercent,
        };
      }),
    );

    return alerts
      .filter((alert) => alert.usagePercent >= alert.alertThresholdPercent)
      .sort((a, b) => b.usagePercent - a.usagePercent);
  }

  private resolvePeriod(from?: string, to?: string): PeriodRange {
    const now = new Date();
    const periodFrom = from
      ? this.startOfDay(this.parseDateOnly(from, 'from'))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodTo = to ? this.endOfDay(this.parseDateOnly(to, 'to')) : now;

    if (periodFrom.getTime() > periodTo.getTime()) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    return { from: periodFrom, to: periodTo };
  }

  private resolvePreviousPeriod(period: PeriodRange): PeriodRange {
    const durationMs = period.to.getTime() - period.from.getTime();
    const previousTo = new Date(period.from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);

    return { from: previousFrom, to: previousTo };
  }

  private parseDateOnly(value: string, field: 'from' | 'to'): Date {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:$|T)/.exec(value);
    if (!match) {
      throw new BadRequestException(`Invalid "${field}" date`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(`Invalid "${field}" date`);
    }

    return date;
  }

  private startOfDay(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  private endOfDay(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
}
