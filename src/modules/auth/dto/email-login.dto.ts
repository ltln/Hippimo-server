import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailLoginDto {
  @ApiProperty({
    description: 'Email address to verify with the login code.',
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
    description: '6-digit login code sent to the email address',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({
    description: 'Client device identifier used when requesting the login code',
    example: 'ios-device-123',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deviceId!: string;
}
