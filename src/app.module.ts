import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule } from './core/config/config.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { PrismaService } from './core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from './core/redis/redis.service';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, PrismaService, JwtService, RedisService],
})
export class AppModule {}
