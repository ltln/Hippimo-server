import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus, CategoryType } from 'src/core/prisma/prisma.client';

export class Category {
  @ApiProperty({
    description: 'Category UUID.',
    example: '4411b598-c7cd-4724-967d-1de2e31b0616',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Owner user UUID.',
    example: 'ffbd5f5e-263a-45db-9d83-e762a11d8c9b',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'Category display name.',
    example: 'Groceries',
    maxLength: 50,
  })
  name!: string;

  @ApiProperty({
    description: 'Category type.',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  type!: CategoryType;

  @ApiPropertyOptional({
    description: 'Category icon name or image URL.',
    example: 'shopping-cart',
    maxLength: 255,
    nullable: true,
  })
  icon?: string | null;

  @ApiPropertyOptional({
    description: 'Category color value.',
    example: '#22C55E',
    maxLength: 20,
    nullable: true,
  })
  color?: string | null;

  @ApiProperty({
    description: 'Category status.',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  status!: CategoryStatus;
}
