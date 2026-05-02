import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Request, Response } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 8000;

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const openApiConfig = new DocumentBuilder()
    .setTitle('Hippimo API')
    .setDescription('Hippimo server API documentation')
    .setVersion('1.0')
    .addServer('/api/v1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned from a login endpoint',
      },
      'access-token',
    )
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig, {
    ignoreGlobalPrefix: true,
  });

  app.use('/openapi.json', (_request: Request, response: Response) => {
    response.json(openApiDocument);
  });
  app.use(
    '/docs',
    apiReference({
      pageTitle: 'Hippimo API Reference',
      url: '/openapi.json',
    }),
  );

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap().catch((error) => console.error(error));
