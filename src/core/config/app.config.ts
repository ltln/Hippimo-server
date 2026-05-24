import { registerAs } from '@nestjs/config';

const nullableEnv = (value: string | undefined) => {
  if (!value || value.trim().toLowerCase() === 'null') return undefined;

  return value;
};

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '8000', 10),
  env: process.env.NODE_ENV || 'development',
}));

export const authConfig = registerAs('auth', () => ({
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '15d',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  emailLoginCodeExpiresIn: process.env.EMAIL_LOGIN_CODE_EXPIRES_IN || '3m',
  emailLoginCodeMaxAttempts: parseInt(
    process.env.EMAIL_LOGIN_CODE_MAX_ATTEMPTS || '5',
    10,
  ),
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

export const mailConfig = registerAs('mail', () => ({
  host: nullableEnv(process.env.MAIL_HOST),
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_SECURE === 'true',
  user: nullableEnv(process.env.MAIL_USER),
  pass: nullableEnv(process.env.MAIL_PASS),
  from:
    nullableEnv(process.env.MAIL_FROM) || nullableEnv(process.env.MAIL_USER),
  loginCodeTemplatePath: nullableEnv(process.env.MAIL_LOGIN_CODE_TEMPLATE_PATH),
  loginCodeTemplateHtml: nullableEnv(process.env.MAIL_LOGIN_CODE_TEMPLATE_HTML),
}));
