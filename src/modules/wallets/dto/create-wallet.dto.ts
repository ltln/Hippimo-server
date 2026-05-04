import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WalletType } from 'src/core/prisma/prisma.client';

export class CreateWalletDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  userId!: number;

  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name!: string;

  @IsEnum(WalletType)
  @MaxLength(50)
  @IsNotEmpty()
  type!: WalletType;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  balance!: number;
}
