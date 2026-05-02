import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig, authConfig, mailConfig, redisConfig } from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, redisConfig, mailConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(8000),
        REDIS_URL: Joi.string().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(), // Bắt buộc phải có
        ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_SECRET: Joi.string().required(), // Bắt buộc phải có
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('15d'),
        EMAIL_LOGIN_CODE_EXPIRES_IN: Joi.string().default('10m'),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        MAIL_HOST: Joi.string().allow('').optional(),
        MAIL_PORT: Joi.number().default(587),
        MAIL_SECURE: Joi.boolean().default(false),
        MAIL_USER: Joi.string().allow('').optional(),
        MAIL_PASS: Joi.string().allow('').optional(),
        MAIL_FROM: Joi.string().allow('').optional(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
  ],
})
export class ConfigModule {}
