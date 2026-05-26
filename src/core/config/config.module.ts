import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import {
  appConfig,
  authConfig,
  mailConfig,
  redisConfig,
  s3Config,
} from './app.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, redisConfig, mailConfig, s3Config],
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
        S3_REGION: Joi.string().default('auto'),
        S3_ENDPOINT: Joi.string().uri().allow('').optional(),
        S3_BUCKET: Joi.string().allow('').optional(),
        S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
        S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
        S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
        S3_PUBLIC_URL: Joi.string().uri().allow('').optional(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
  ],
})
export class ConfigModule {}
