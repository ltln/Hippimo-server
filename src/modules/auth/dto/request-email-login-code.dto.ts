import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailLoginCodeDto {
  @ApiProperty({
    description: 'Email address that receives the login code',
    example: 'user@example.com',
    maxLength: 100,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  email!: string;

  @ApiProperty({
    description: 'Client device identifier',
    example: 'ios-device-123',
    maxLength: 120,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  deviceId!: string;
}
