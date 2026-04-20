import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleMobileLoginDto {
  @IsNotEmpty()
  @IsString()
  idToken!: string;
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  deviceId!: string;
}
