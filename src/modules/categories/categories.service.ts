import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CategoryStatus, Prisma } from 'src/core/prisma/prisma.client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  categoryId: true,
  userId: true,
  name: true,
  type: true,
  icon: true,
  color: true,
  status: true,
} as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    await this.ensureUserExists(userId);
    const normalizedName = this.normalizeName(createCategoryDto.name);
    await this.ensureCategoryNameIsUnique(userId, normalizedName);

    try {
      return await this.prisma.category.create({
        data: {
          userId,
          name: normalizedName,
          type: createCategoryDto.type,
          icon: createCategoryDto.icon,
          color: createCategoryDto.color,
        },
        select: categorySelect,
      });
    } catch (error) {
      this.handleCategoryWriteError(error);
    }
  }

  async findAllByUser(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.category.findMany({
      where: {
        userId,
        status: CategoryStatus.ACTIVE,
      },
      select: categorySelect,
      orderBy: {
        categoryId: 'asc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        categoryId: id,
        userId,
        status: CategoryStatus.ACTIVE,
      },
      select: categorySelect,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    userId: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    this.validateUpdatePayloadHasChanges(updateCategoryDto);

    const category = await this.prisma.category.findFirst({
      where: {
        categoryId: id,
        userId,
        status: CategoryStatus.ACTIVE,
      },
      select: {
        categoryId: true,
        name: true,
        type: true,
        status: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (
      updateCategoryDto.type !== undefined &&
      updateCategoryDto.type !== category.type
    ) {
      await this.ensureCategoryTypeCanBeChanged(id, userId);
    }

    const normalizedName =
      updateCategoryDto.name !== undefined
        ? this.normalizeName(updateCategoryDto.name)
        : undefined;
    const nextName = normalizedName ?? category.name;
    const nextStatus = updateCategoryDto.status ?? category.status;

    if (nextStatus === CategoryStatus.ACTIVE) {
      await this.ensureCategoryNameIsUnique(userId, nextName, id);
    }

    try {
      return await this.prisma.category.update({
        where: {
          categoryId: id,
        },
        data: {
          name: normalizedName,
          type: updateCategoryDto.type,
          icon: updateCategoryDto.icon,
          color: updateCategoryDto.color,
          status: updateCategoryDto.status,
        },
        select: categorySelect,
      });
    } catch (error) {
      this.handleCategoryWriteError(error);
    }
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        categoryId: id,
        userId,
        status: CategoryStatus.ACTIVE,
      },
      select: {
        categoryId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.category.update({
      where: {
        categoryId: id,
      },
      data: {
        status: CategoryStatus.INACTIVE,
      },
    });

    return { message: 'Category deleted successfully', categoryId: id };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        userId,
      },
      select: {
        userId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private normalizeName(name: string) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    return normalizedName;
  }

  private async ensureCategoryNameIsUnique(
    userId: string,
    name: string,
    exceptCategoryId?: string,
  ) {
    const where: Prisma.CategoryWhereInput = {
      userId,
      name: {
        equals: name,
        mode: 'insensitive',
      },
      status: CategoryStatus.ACTIVE,
    };

    if (exceptCategoryId !== undefined) {
      where.categoryId = {
        not: exceptCategoryId,
      };
    }

    const existingCategory = await this.prisma.category.findFirst({
      where,
      select: {
        categoryId: true,
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Category name already exists');
    }
  }

  private validateUpdatePayloadHasChanges(
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const updateableFields: Array<keyof UpdateCategoryDto> = [
      'name',
      'type',
      'icon',
      'color',
      'status',
    ];

    const hasChanges = updateableFields.some(
      (field) => updateCategoryDto[field] !== undefined,
    );

    if (!hasChanges) {
      throw new BadRequestException('No category fields provided to update');
    }
  }

  private handleCategoryWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('Category name already exists');
    }

    throw error;
  }

  private async ensureCategoryTypeCanBeChanged(
    categoryId: string,
    userId: string,
  ) {
    const usedTransactionsCount = await this.prisma.transaction.count({
      where: {
        categoryId,
        userId,
      },
    });

    if (usedTransactionsCount > 0) {
      throw new BadRequestException(
        'Cannot change category type because this category is already used in transactions',
      );
    }
  }
}
