import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WalletType } from 'src/core/prisma/prisma.client';

export class UpdateWalletDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEnum(WalletType)
  @MaxLength(50)
  type?: WalletType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
