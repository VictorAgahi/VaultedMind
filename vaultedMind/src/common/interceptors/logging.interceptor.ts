import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const body = request.body as unknown;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    const sanitizedBody = this.sanitize(body);

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const delay = Date.now() - now;

        this.logger.log(
          `${method} ${url} ${statusCode} - ${delay}ms | IP: ${ip} | UA: ${userAgent} | Body: ${JSON.stringify(
            sanitizedBody,
          )}`,
        );
      }),
    );
  }

  private sanitize(body: unknown): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body;

    const sensitiveKeys = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'newPassword',
      'oldPassword',
    ];

    const sanitized = { ...(body as Record<string, unknown>) };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
