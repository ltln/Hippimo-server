import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryStatus, CategoryType } from 'src/core/prisma/prisma.client';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  icon?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
