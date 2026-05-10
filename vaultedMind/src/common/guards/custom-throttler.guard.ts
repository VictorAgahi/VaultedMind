/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<{
      ip: string;
      connection?: { remoteAddress?: string };
      method: string;
      url: string;
    }>();

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    this.logger.warn(
      `Rate limit exceeded for IP: ${ip} on route ${req.method} ${req.url}. Limit detail: ${JSON.stringify(throttlerLimitDetail)}`,
    );

    const rawMessage = await this.errorMessage(context, throttlerLimitDetail);
    const message =
      typeof rawMessage === 'string' ? rawMessage : String(rawMessage);
    throw new ThrottlerException(message);
  }
}
