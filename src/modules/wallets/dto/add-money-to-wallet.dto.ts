import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMoneyToWalletDto {
  @ApiProperty({
    description: 'Amount to add to the wallet. Must be a positive integer.',
    example: 100000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amount!: number;
}
