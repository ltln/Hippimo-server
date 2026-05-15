import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import {
  BudgetPeriodType,
  CategoryStatus,
  CategoryType,
  Prisma,
  TransactionType,
} from 'src/core/prisma/prisma.client';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';

const budgetSelect = {
  budgetId: true,
  userId: true,
  categoryId: true,
  amountLimit: true,
  periodType: true,
  periodStart: true,
  periodEnd: true,
  alertThresholdPercent: true,
} as const;

type BudgetRecord = Prisma.BudgetGetPayload<{ select: typeof budgetSelect }>;

type BudgetProgress = {
  spentAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  usagePercent: number;
  overThreshold: boolean;
  alertMessage: string | null;
};

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    await this.ensureExpenseCategory(createBudgetDto.categoryId, userId);

    const { periodStart, periodEnd } = this.resolvePeriodRange(
      createBudgetDto.periodType,
      createBudgetDto.periodStart,
    );

    await this.ensureBudgetIsUnique(
      userId,
      createBudgetDto.categoryId,
      createBudgetDto.periodType,
      periodStart,
    );

    const budget = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: createBudgetDto.categoryId,
        amountLimit: new Prisma.Decimal(createBudgetDto.amountLimit),
        periodType: createBudgetDto.periodType,
        periodStart,
        periodEnd,
        alertThresholdPercent: createBudgetDto.alertThresholdPercent,
      },
      select: budgetSelect,
    });

    return this.buildBudgetWithProgress(budget);
  }

  async findAllByUser(userId: string, filters: ListBudgetsDto) {
    const where: Prisma.BudgetWhereInput = {
      userId,
    };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.periodType) {
      where.periodType = filters.periodType;
    }

    if (filters.periodStart) {
      where.periodStart = this.parseDateOnly(filters.periodStart);
    }

    const budgets = await this.prisma.budget.findMany({
      where,
      select: budgetSelect,
      orderBy: {
        periodStart: 'desc',
      },
    });

    return Promise.all(
      budgets.map((budget) => this.buildBudgetWithProgress(budget)),
    );
  }

  async findOne(id: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        budgetId: id,
        userId,
      },
      select: budgetSelect,
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return this.buildBudgetWithProgress(budget);
  }

  async update(id: string, userId: string, updateBudgetDto: UpdateBudgetDto) {
    this.validateUpdatePayloadHasChanges(updateBudgetDto);

    const budget = await this.prisma.budget.findFirst({
      where: {
        budgetId: id,
        userId,
      },
      select: budgetSelect,
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const nextCategoryId = updateBudgetDto.categoryId ?? budget.categoryId;
    const nextPeriodType = updateBudgetDto.periodType ?? budget.periodType;
    const nextPeriodStart =
      updateBudgetDto.periodStart !== undefined
        ? this.parseDateOnly(updateBudgetDto.periodStart)
        : this.normalizeDateOnly(budget.periodStart);
    const { periodStart, periodEnd } = this.resolvePeriodRange(
      nextPeriodType,
      nextPeriodStart,
    );

    const shouldUpdatePeriod =
      updateBudgetDto.periodType !== undefined ||
      updateBudgetDto.periodStart !== undefined;

    if (updateBudgetDto.categoryId !== undefined) {
      await this.ensureExpenseCategory(updateBudgetDto.categoryId, userId);
    }

    await this.ensureBudgetIsUnique(
      userId,
      nextCategoryId,
      nextPeriodType,
      periodStart,
      budget.budgetId,
    );

    const updatedBudget = await this.prisma.budget.update({
      where: {
        budgetId: id,
      },
      data: {
        categoryId: updateBudgetDto.categoryId,
        amountLimit:
          updateBudgetDto.amountLimit !== undefined
            ? new Prisma.Decimal(updateBudgetDto.amountLimit)
            : undefined,
        periodType: shouldUpdatePeriod ? nextPeriodType : undefined,
        periodStart: shouldUpdatePeriod ? periodStart : undefined,
        periodEnd: shouldUpdatePeriod ? periodEnd : undefined,
        alertThresholdPercent: updateBudgetDto.alertThresholdPercent,
      },
      select: budgetSelect,
    });

    return this.buildBudgetWithProgress(updatedBudget);
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.budget.deleteMany({
      where: {
        budgetId: id,
        userId,
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Budget not found');
    }

    return { message: 'Budget deleted successfully', budgetId: id };
  }

  private async buildBudgetWithProgress(budget: BudgetRecord) {
    const progress = await this.calculateBudgetProgress(budget);

    return {
      ...budget,
      ...progress,
    };
  }

  private async calculateBudgetProgress(
    budget: BudgetRecord,
  ): Promise<BudgetProgress> {
    const amountLimit = new Prisma.Decimal(budget.amountLimit);
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId: budget.userId,
        categoryId: budget.categoryId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        isExcludedFromReport: false,
        transactionDate: {
          gte: budget.periodStart,
          lte: budget.periodEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const spentAmount = result._sum.amount ?? new Prisma.Decimal(0);
    const remainingAmount = amountLimit.minus(spentAmount);
    const usagePercent = amountLimit.equals(0)
      ? 0
      : spentAmount.dividedBy(amountLimit).times(100).toNumber();
    const overThreshold = usagePercent >= budget.alertThresholdPercent;
    const alertMessage = overThreshold
      ? `Budget usage exceeded ${budget.alertThresholdPercent}%`
      : null;

    return {
      spentAmount,
      remainingAmount,
      usagePercent,
      overThreshold,
      alertMessage,
    };
  }

  private async ensureExpenseCategory(categoryId: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        categoryId,
        userId,
        status: CategoryStatus.ACTIVE,
      },
      select: {
        categoryId: true,
        type: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.type !== CategoryType.EXPENSE) {
      throw new BadRequestException(
        'Budget can only be created for expense categories',
      );
    }
  }

  private validateUpdatePayloadHasChanges(updateBudgetDto: UpdateBudgetDto) {
    const updateableFields: Array<keyof UpdateBudgetDto> = [
      'categoryId',
      'amountLimit',
      'periodType',
      'periodStart',
      'alertThresholdPercent',
    ];

    const hasChanges = updateableFields.some(
      (field) => updateBudgetDto[field] !== undefined,
    );

    if (!hasChanges) {
      throw new BadRequestException('No budget fields provided to update');
    }
  }

  private async ensureBudgetIsUnique(
    userId: string,
    categoryId: string,
    periodType: BudgetPeriodType,
    periodStart: Date,
    excludeBudgetId?: string,
  ) {
    const where: Prisma.BudgetWhereInput = {
      userId,
      categoryId,
      periodType,
      periodStart,
    };

    if (excludeBudgetId) {
      where.budgetId = {
        not: excludeBudgetId,
      };
    }

    const existingBudget = await this.prisma.budget.findFirst({
      where,
      select: {
        budgetId: true,
      },
    });

    if (existingBudget) {
      throw new BadRequestException('Budget for this period already exists');
    }
  }

  private resolvePeriodRange(
    periodType: BudgetPeriodType,
    periodStartInput: string | Date,
  ) {
    const periodStart =
      typeof periodStartInput === 'string'
        ? this.parseDateOnly(periodStartInput)
        : this.normalizeDateOnly(periodStartInput);
    const days = this.getPeriodLengthDays(periodType);
    const periodEnd = new Date(
      periodStart.getTime() + days * 24 * 60 * 60 * 1000 - 1,
    );

    return { periodStart, periodEnd };
  }

  private parseDateOnly(value: string): Date {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})(?:$|T)/.exec(value);
    if (!match) {
      throw new BadRequestException('Invalid periodStart date');
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
      throw new BadRequestException('Invalid periodStart date');
    }

    return date;
  }

  private normalizeDateOnly(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private getPeriodLengthDays(periodType: BudgetPeriodType): number {
    switch (periodType) {
      case BudgetPeriodType.WEEK:
        return 7;
      case BudgetPeriodType.MONTH:
        return 30;
      case BudgetPeriodType.YEAR:
        return 365;
      default:
        return 30;
    }
  }
}
