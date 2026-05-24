import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WalletType } from 'src/core/prisma/prisma.client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWalletDto {
  @ApiPropertyOptional({
    description: 'Wallet display name.',
    example: 'Main cash wallet',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Wallet type.',
    enum: WalletType,
    example: WalletType.CASH,
    maxLength: 50,
  })
  @IsOptional()
  @IsEnum(WalletType)
  @MaxLength(50)
  type?: WalletType;

  @ApiPropertyOptional({
    description: 'Whether the wallet is active.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
