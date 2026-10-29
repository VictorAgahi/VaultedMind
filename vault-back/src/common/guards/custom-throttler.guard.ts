import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

type TrackedRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  connection?: { remoteAddress?: string };
};

/**
 * Resolves the real client IP.
 * Behind Cloudflare Tunnel + Traefik, req.ip is the proxy address (shared by every user)
 * or a client-controlled X-Forwarded-For entry. TRUSTED_CLIENT_IP_HEADER (e.g. cf-connecting-ip)
 * names a header set by the edge proxy; only enable it when the origin is unreachable directly.
 */
export function resolveClientIp(req: TrackedRequest): string {
  const headerName = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  if (headerName) {
    const raw = req.headers?.[headerName];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) return value;
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    await Promise.resolve();
    return resolveClientIp(req as TrackedRequest);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    await Promise.resolve();
    const req = context.switchToHttp().getRequest<
      TrackedRequest & {
        method: string;
        url: string;
      }
    >();

    const ip = resolveClientIp(req);

    this.logger.warn(
      `Rate limit exceeded for IP: ${ip} on route ${req.method} ${req.url}. Limit detail: ${JSON.stringify(throttlerLimitDetail)}`,
    );

    const message = this.errorMessage;
    throw new ThrottlerException(message);
  }
}
