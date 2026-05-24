import { ApiProperty } from '@nestjs/swagger';
import { WalletType } from 'src/core/prisma/prisma.client';

export class Wallet {
  @ApiProperty({
    description: 'Wallet UUID.',
    example: '2ef8f823-5ac6-40cf-9443-448dce6760f5',
    format: 'uuid',
  })
  walletId!: string;

  @ApiProperty({
    description: 'Owner user UUID.',
    example: 'ffbd5f5e-263a-45db-9d83-e762a11d8c9b',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'Wallet display name.',
    example: 'Main cash wallet',
    maxLength: 50,
  })
  name!: string;

  @ApiProperty({
    description: 'Wallet type.',
    enum: WalletType,
    example: WalletType.CASH,
  })
  type!: WalletType;

  @ApiProperty({
    description: 'Wallet balance as a decimal string.',
    example: '500000.00',
  })
  balance!: string;

  @ApiProperty({
    description: 'Whether the wallet is active.',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Date and time when this wallet was created.',
    example: '2026-05-24T10:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}
