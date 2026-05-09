import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddMoneyToWalletDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amount!: number;
}
