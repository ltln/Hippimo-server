import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { authConfig } from 'src/core/config/app.config';
import { UserProvider } from 'src/core/prisma/prisma.client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export type AccessTokenPayload = {
  sub: number;
  sid: string;
  provider: UserProvider;
  type: 'access';
};

export type AuthenticatedRequest = Request & {
  userId: number;
  auth: AccessTokenPayload;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConf: ConfigType<typeof authConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.authConf.accessTokenSecret,
        },
      );

      if (!this.isValidAccessTokenPayload(payload)) {
        throw new UnauthorizedException('Invalid access token');
      }

      request.userId = payload.sub;
      request.auth = payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private isValidAccessTokenPayload(
    payload: Partial<AccessTokenPayload>,
  ): payload is AccessTokenPayload {
    return (
      typeof payload.sub === 'number' &&
      typeof payload.sid === 'string' &&
      Boolean(payload.sid) &&
      this.isValidProvider(payload.provider) &&
      payload.type === 'access'
    );
  }

  private isValidProvider(provider: unknown): provider is UserProvider {
    return (
      provider === UserProvider.GOOGLE ||
      provider === UserProvider.APPLE ||
      provider === UserProvider.GMAIL
    );
  }
}
