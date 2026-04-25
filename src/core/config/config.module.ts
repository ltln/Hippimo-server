import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig, authConfig, redisConfig } from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, redisConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(8000),
        REDIS_URL: Joi.string().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(), // Bắt buộc phải có
        ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_SECRET: Joi.string().required(), // Bắt buộc phải có
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('15d'),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
  ],
})
export class ConfigModule {}
