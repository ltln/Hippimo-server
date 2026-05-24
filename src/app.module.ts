import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule } from './core/config/config.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from './core/redis/redis.service';
import { AuthGuard } from './core/common/guards/auth.guard';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { BudgetsModule } from './modules/budgets/budgets.module';

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
    TransactionsModule,
    WalletsModule,
    CategoriesModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    JwtService,
    RedisService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
