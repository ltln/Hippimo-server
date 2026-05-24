import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { GoogleMobileLoginDto } from './dto/google-login.dto';
import { authConfig } from 'src/core/config/app.config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CategoryType, UserProvider } from 'src/core/prisma/prisma.client';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RedisService } from 'src/core/redis/redis.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { isUUID } from 'class-validator';
import { RequestEmailLoginCodeDto } from './dto/request-email-login-code.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { MailService } from 'src/providers/mail/mail.service';

const defaultCategories = [
  {
    name: 'Salary',
    type: CategoryType.INCOME,
    icon: 'wallet',
    color: '#16A34A',
  },
  {
    name: 'Food',
    type: CategoryType.EXPENSE,
    icon: 'utensils',
    color: '#F97316',
  },
  {
    name: 'Transport',
    type: CategoryType.EXPENSE,
    icon: 'car',
    color: '#2563EB',
  },
  {
    name: 'Shopping',
    type: CategoryType.EXPENSE,
    icon: 'shopping-bag',
    color: '#DB2777',
  },
  {
    name: 'Bills',
    type: CategoryType.EXPENSE,
    icon: 'receipt',
    color: '#7C3AED',
  },
] as const;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConf: ConfigType<typeof authConfig>,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(this.authConf.googleClientId);
  }
  //logic xử lý đăng nhập
  async googleLogin(dto: GoogleMobileLoginDto) {
    const payload = await this.verifyGoogleToken(dto.idToken);
    const user = await this.findOrCreateUser(payload);
    const tokens = await this.issueTokens(user.userId, UserProvider.GOOGLE);
    await this.saveRefreshSession(
      user.userId,
      UserProvider.GOOGLE,
      tokens.sid,
      tokens.refreshToken,
    );
    const tokenResponse = {
      tokenType: tokens.tokenType,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    return {
      message: 'Google token verified and user authenticated successfully',
      user,
      tokens: tokenResponse,
      google: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      },
    };
  }
  //Tìm kiếm hoặc tạo mới user trong database
  async requestEmailLoginCode(dto: RequestEmailLoginCodeDto) {
    const email = this.normalizeEmail(dto.email);
    await this.ensureEmailCanUseEmailProvider(email);
    const code = randomInt(100000, 1000000).toString();
    const ttl = this.parseDurationToSeconds(
      this.authConf.emailLoginCodeExpiresIn,
    );
    const hash = await argon2.hash(code);

    await this.redisService.set(
      this.getEmailLoginCodeKey(email),
      JSON.stringify({
        hash,
        deviceId: dto.deviceId,
        attempts: 0,
      }),
      'EX',
      ttl,
    );
    await this.mailService.sendLoginCode(
      email,
      code,
      this.authConf.emailLoginCodeExpiresIn,
    );

    return {
      message: 'Login code sent successfully',
      expiresIn: ttl,
    };
  }

  async verifyEmailLoginCode(dto: EmailLoginDto) {
    const email = this.normalizeEmail(dto.email);
    const loginCode = await this.getEmailLoginCode(email);

    if (!loginCode) {
      throw new UnauthorizedException('Invalid or expired login code');
    }

    if (loginCode.attempts >= this.authConf.emailLoginCodeMaxAttempts) {
      await this.redisService.del(this.getEmailLoginCodeKey(email));
      throw new UnauthorizedException('Too many invalid login code attempts');
    }

    if (loginCode.deviceId !== dto.deviceId) {
      await this.registerEmailLoginCodeFailure(email, loginCode);
      throw new UnauthorizedException('Invalid or expired login code');
    }

    const isMatch = await argon2.verify(loginCode.hash, dto.code);

    if (!isMatch) {
      await this.registerEmailLoginCodeFailure(email, loginCode);
      throw new UnauthorizedException('Invalid or expired login code');
    }

    const user = await this.findOrCreateEmailUser(email);

    const tokens = await this.issueTokens(user.userId, UserProvider.EMAIL);
    await this.saveRefreshSession(
      user.userId,
      UserProvider.EMAIL,
      tokens.sid,
      tokens.refreshToken,
    );
    await this.redisService.del(this.getEmailLoginCodeKey(email));

    return {
      message: 'Email login successful',
      user,
      tokens: {
        tokenType: tokens.tokenType,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  private async findOrCreateEmailUser(email: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        fullName: true,
        provider: true,
        currency: true,
        createdAt: true,
      },
    });

    if (existingUser) {
      if (existingUser.provider !== UserProvider.EMAIL) {
        throw new UnauthorizedException(
          `Account already linked with provider ${existingUser.provider}. Please use correct login method.`,
        );
      }
      return existingUser;
    }

    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          provider: UserProvider.EMAIL,
          providerSubject: email,
          currency: 'VND',
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          provider: true,
          currency: true,
          createdAt: true,
        },
      });

      await tx.category.createMany({
        data: defaultCategories.map((category) => ({
          userId: user.userId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        })),
      });

      return user;
    });
  }

  private async ensureEmailCanUseEmailProvider(email: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        provider: true,
      },
    });

    if (existingUser && existingUser.provider !== UserProvider.EMAIL) {
      throw new UnauthorizedException(
        `Account already linked with provider ${existingUser.provider}. Please use correct login method.`,
      );
    }
  }

  private async findOrCreateUser(payload: TokenPayload) {
    const email = payload.email?.trim().toLowerCase();
    const providerSubject = payload.sub;

    if (!providerSubject) {
      throw new UnauthorizedException('Invalid Google token: missing sub');
    }

    if (!email || !payload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    let user = await this.prismaService.user.findUnique({
      where: {
        provider_providerSubject: {
          provider: UserProvider.GOOGLE,
          providerSubject,
        },
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        provider: true,
        currency: true,
        createdAt: true,
      },
    });

    if (user) {
      return user;
    }

    const existingUserByEmail = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        userId: true,
        email: true,
        fullName: true,
        provider: true,
        providerSubject: true,
        currency: true,
        createdAt: true,
      },
    });

    if (
      existingUserByEmail &&
      existingUserByEmail.provider !== UserProvider.GOOGLE
    ) {
      throw new UnauthorizedException(
        `Account already linked with provider ${existingUserByEmail.provider}. Please use correct login method.`,
      );
    }

    if (existingUserByEmail?.providerSubject) {
      throw new UnauthorizedException(
        'Google account is already linked to another Google subject',
      );
    }

    if (existingUserByEmail) {
      return this.prismaService.user.update({
        where: { userId: existingUserByEmail.userId },
        data: {
          providerSubject,
          fullName:
            payload.name?.trim().slice(0, 50) ?? existingUserByEmail.fullName,
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          provider: true,
          currency: true,
          createdAt: true,
        },
      });
    }

    user = await this.prismaService.user.create({
      data: {
        email,
        fullName: payload.name?.trim().slice(0, 50) ?? null,
        provider: UserProvider.GOOGLE,
        providerSubject,
        currency: 'VND',
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        provider: true,
        currency: true,
        createdAt: true,
      },
    });

    return user;
  }

  //Xác nhận token client gửi lên có hợp lệ hay không
  private async verifyGoogleToken(idToken: string): Promise<TokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.authConf.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Google token: missing sub');
      }
      const validIssuer =
        payload.iss === 'accounts.google.com' ||
        payload.iss === 'https://accounts.google.com';
      if (!validIssuer) {
        throw new UnauthorizedException('Invalid Google token: wrong issuer');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Google token');
    }
  }
  //Phát hành access token và refresh token
  private async issueTokens(
    userId: string,
    provider: UserProvider,
    sid = uuidv4(),
  ) {
    const accessTokenPayload = {
      sub: userId,
      sid,
      provider,
      type: 'access' as const,
    };
    const refreshTokenPayload = {
      sub: userId,
      sid,
      provider,
      type: 'refresh' as const,
    };
    const accessTokenExpiresIn = this.parseDurationToSeconds(
      this.authConf.accessTokenExpiresIn,
    );
    const refreshTokenExpiresIn = this.parseDurationToSeconds(
      this.authConf.refreshTokenExpiresIn,
    );
    const accessToken = this.jwtService.signAsync(accessTokenPayload, {
      secret: this.authConf.accessTokenSecret,
      expiresIn: accessTokenExpiresIn,
    });
    const refreshToken = this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.authConf.refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn,
    });
    return {
      tokenType: 'Bearer',
      accessToken: await accessToken,
      refreshToken: await refreshToken,
      sid,
    };
  }
  //Xử lý làm mới token
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.verifyRefreshToken(dto.refreshToken);
      const sessionSnapshot = await this.getRefreshSessionSnapshot(
        payload.provider,
        payload.sid,
      );
      if (!sessionSnapshot) {
        throw new UnauthorizedException('Refresh session not found');
      }
      const session = sessionSnapshot.session;
      if (session.userId !== payload.sub) {
        throw new UnauthorizedException(
          'Refresh token does not match session user',
        );
      }
      const isMatch = await argon2.verify(session.hash, dto.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.prismaService.user.findUnique({
        where: { userId: payload.sub },
        select: {
          userId: true,
          email: true,
          fullName: true,
          provider: true,
          currency: true,
          createdAt: true,
        },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const tokens = await this.issueTokens(
        user.userId,
        payload.provider,
        payload.sid,
      );
      const rotated = await this.rotateRefreshSessionAtomic(
        user.userId,
        payload.provider,
        payload.sid,
        sessionSnapshot.raw,
        tokens.refreshToken,
      );
      if (!rotated) {
        throw new UnauthorizedException('Refresh token has been rotated');
      }
      const tokenResponse = {
        tokenType: tokens.tokenType,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      return {
        message: 'Token refreshed successfully',
        user,
        tokens: tokenResponse,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  //Xác nhận refresh token có hợp lệ hay không
  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string; sid: string; provider: UserProvider }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        sid: string;
        provider: UserProvider;
        type: string;
      }>(refreshToken, {
        secret: this.authConf.refreshTokenSecret,
      });
      const validProvider =
        payload.provider === UserProvider.GOOGLE ||
        payload.provider === UserProvider.APPLE ||
        payload.provider === UserProvider.EMAIL;
      if (
        typeof payload.sub !== 'string' ||
        !isUUID(payload.sub, '4') ||
        !payload.sid ||
        !validProvider ||
        payload.type !== 'refresh'
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return { sub: payload.sub, sid: payload.sid, provider: payload.provider };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  // Xử lý đăng xuất, xóa session trong redis
  async logout(dto: RefreshTokenDto) {
    try {
      const payload = await this.verifyRefreshToken(dto.refreshToken);
      const session = await this.getRefreshSession(
        payload.provider,
        payload.sid,
      );
      if (!session || session.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const isMatch = await argon2.verify(session.hash, dto.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      await this.redisService.del(
        this.getSessionKey(payload.provider, payload.sid),
      );
      return {
        message: 'Logout successful',
      };
    } catch {
      throw new UnauthorizedException('Logout failed');
    }
  }
  //Lưu session đăng nhập vào redis với refresh token đã hash để tăng cường bảo mật
  private async saveRefreshSession(
    userId: string,
    provider: UserProvider,
    sid: string,
    refreshToken: string,
  ) {
    const hash = await argon2.hash(refreshToken);
    const ttl = this.parseDurationToSeconds(
      this.authConf.refreshTokenExpiresIn,
    );
    const key = this.getSessionKey(provider, sid);
    await this.redisService.set(
      key,
      JSON.stringify({ userId, hash }),
      'EX',
      ttl,
    );
  }

  //Rotate refresh session theo compare-and-set để tránh race condition khi refresh đồng thời
  private async rotateRefreshSessionAtomic(
    userId: string,
    provider: UserProvider,
    sid: string,
    expectedRawSession: string,
    nextRefreshToken: string,
  ) {
    const nextHash = await argon2.hash(nextRefreshToken);
    const ttl = this.parseDurationToSeconds(
      this.authConf.refreshTokenExpiresIn,
    );
    const key = this.getSessionKey(provider, sid);
    const nextRawSession = JSON.stringify({ userId, hash: nextHash });
    return this.redisService.compareAndSetEx(
      key,
      expectedRawSession,
      nextRawSession,
      ttl,
    );
  }

  private async getRefreshSessionSnapshot(
    provider: UserProvider,
    sid: string,
  ): Promise<{
    raw: string;
    session: { userId: string; hash: string };
  } | null> {
    const raw = await this.redisService.get(this.getSessionKey(provider, sid));
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as { userId: string; hash: string };
      return { raw, session };
    } catch {
      return null;
    }
  }

  //Lấy session từ redis và so sánh hash của refresh token để xác thực
  private async getRefreshSession(
    provider: UserProvider,
    sid: string,
  ): Promise<{ userId: string; hash: string } | null> {
    const snapshot = await this.getRefreshSessionSnapshot(provider, sid);
    return snapshot?.session ?? null;
  }
  //Hàm tạo key cho session trong redis
  private getSessionKey(provider: UserProvider, sid: string) {
    return `AUTH:SESSION:${provider}:${sid}`;
  }
  //Hàm chuyển đổi thời gian từ config (ví dụ '15d') sang giây để set TTL trong redis
  private getEmailLoginCodeKey(email: string) {
    return `AUTH:EMAIL_LOGIN_CODE:${email}`;
  }

  private async getEmailLoginCode(
    email: string,
  ): Promise<{ hash: string; deviceId: string; attempts: number } | null> {
    const raw = await this.redisService.get(this.getEmailLoginCodeKey(email));
    if (!raw) return null;

    try {
      const loginCode = JSON.parse(raw) as {
        hash?: unknown;
        deviceId?: unknown;
        attempts?: unknown;
      };
      if (
        typeof loginCode.hash !== 'string' ||
        typeof loginCode.deviceId !== 'string'
      ) {
        return null;
      }

      return {
        hash: loginCode.hash,
        deviceId: loginCode.deviceId,
        attempts:
          typeof loginCode.attempts === 'number' ? loginCode.attempts : 0,
      };
    } catch {
      return null;
    }
  }

  private async registerEmailLoginCodeFailure(
    email: string,
    loginCode: { hash: string; deviceId: string; attempts: number },
  ) {
    const key = this.getEmailLoginCodeKey(email);
    const attempts = loginCode.attempts + 1;

    if (attempts >= this.authConf.emailLoginCodeMaxAttempts) {
      await this.redisService.del(key);
      return;
    }

    const ttl = await this.redisService.ttl(key);
    if (ttl <= 0) {
      await this.redisService.del(key);
      return;
    }

    await this.redisService.set(
      key,
      JSON.stringify({
        hash: loginCode.hash,
        deviceId: loginCode.deviceId,
        attempts,
      }),
      'EX',
      ttl,
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private parseDurationToSeconds(value: string): number {
    const text = value.trim().toLowerCase();
    const match = text.match(/^([0-9]+)([smhd])$/);
    if (!match) return 60 * 60 * 24 * 15; // default 15 days
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 60 * 60;
      case 'd':
        return num * 60 * 60 * 24;
      default:
        return 60 * 60 * 24 * 15;
    }
  }
}
