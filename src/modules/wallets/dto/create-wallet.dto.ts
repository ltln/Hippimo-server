import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WalletType } from 'src/core/prisma/prisma.client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Wallet display name.',
    example: 'Main cash wallet',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Wallet type.',
    enum: WalletType,
    example: WalletType.CASH,
    maxLength: 50,
  })
  @IsEnum(WalletType)
  @MaxLength(50)
  @IsNotEmpty()
  type!: WalletType;

  @ApiProperty({
    description: 'Initial wallet balance. Must be a non-negative integer.',
    example: 500000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  balance!: number;
}
