import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryType } from 'src/core/prisma/prisma.client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsEnum(CategoryType)
  @IsNotEmpty()
  type!: CategoryType;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  icon?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;
}
