import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleMobileLoginDto } from './dto/gg-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async googleLogin(@Body() dto: GoogleMobileLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('refresh-token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
