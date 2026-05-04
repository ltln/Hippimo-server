import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleMobileLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from 'src/core/common/decorators/public.decorator';
import { RequestEmailLoginCodeDto } from './dto/request-email-login-code.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Public auth example route' })
  @ApiOkResponse({ description: 'Public route reached successfully' })
  publicExample() {
    return {
      message: 'This auth route is public and does not require an access token',
    };
  }

  @Post('google/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with a Google ID token' })
  @ApiOkResponse({ description: 'Returns the authenticated user and tokens' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async googleLogin(@Body() dto: GoogleMobileLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('email/code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email login code' })
  @ApiOkResponse({ description: 'Login code sent successfully' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestEmailLoginCode(@Body() dto: RequestEmailLoginCodeDto) {
    return this.authService.requestEmailLoginCode(dto);
  }

  @Post('email/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email' })
  @ApiOkResponse({ description: 'Returns the authenticated user and tokens' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async emailLogin(@Body() dto: EmailLoginDto) {
    return this.authService.emailLogin(dto);
  }

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ description: 'Returns refreshed tokens' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out by deleting the refresh session' })
  @ApiOkResponse({ description: 'Logout successful' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
