import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleMobileLoginDto {
  @ApiProperty({
    description: 'Google ID token returned by the mobile client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsNotEmpty()
  @IsString()
  idToken!: string;

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
