import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from 'src/core/redis/redis.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailModule } from 'src/providers/mail/mail.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    PrismaModule,
    JwtModule.register({}),
    RedisModule,
    MailModule,
    ThrottlerModule.forRoot(),
  ],
})
export class AuthModule {}
