import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryStatus, CategoryType } from 'src/core/prisma/prisma.client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description:
      'Category display name. Must be unique among active categories for the current user.',
    example: 'Groceries',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Category type. Cannot be changed after the category is used by transactions.',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Category icon name or image URL.',
    example: 'shopping-cart',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Category color value.',
    example: '#22C55E',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description:
      'Category status. Inactive categories are hidden from normal reads.',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
