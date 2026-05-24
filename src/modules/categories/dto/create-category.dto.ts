import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryType } from 'src/core/prisma/prisma.client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description:
      'Category display name. Must be unique among active categories for the current user.',
    example: 'Groceries',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: 'Category type.',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsEnum(CategoryType)
  @IsNotEmpty()
  type!: CategoryType;

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
}
