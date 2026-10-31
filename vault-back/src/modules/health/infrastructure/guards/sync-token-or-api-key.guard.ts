import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../../auth/infrastructure/guards/api-key.guard.js';
import { HealthSyncTokenService } from '../../application/services/health-sync-token.service.js';

export const SYNC_TOKEN_HEADER = 'x-sync-token';

/**
 * Authenticates the Apple Health shortcut: with the single-use token the app hands over
 * (X-Sync-Token), or with a permanent API key for an optional automation.
 */
@Injectable()
export class SyncTokenOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly syncTokenService: HealthSyncTokenService,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { id: string };
    }>();
    const header = request.headers[SYNC_TOKEN_HEADER];
    if (header === undefined) {
      return this.apiKeyGuard.canActivate(context);
    }

    const token = (Array.isArray(header) ? header[0] : header).trim();
    const userId = token ? await this.syncTokenService.consume(token) : null;
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired sync token');
    }
    request.user = { id: userId };
    return true;
  }
}
