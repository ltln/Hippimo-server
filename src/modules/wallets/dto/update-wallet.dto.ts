import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WalletType } from 'src/core/prisma/prisma.client';

export class UpdateWalletDto {
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
