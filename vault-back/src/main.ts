import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import {
  ALLOWED_ORIGINS,
  originCheckMiddleware,
} from './common/security/origin-check.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });
  app.use(originCheckMiddleware);

  // Trust Cloudflare Proxy
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());
  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
