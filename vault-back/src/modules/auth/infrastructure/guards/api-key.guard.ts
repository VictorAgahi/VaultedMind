import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from '../../application/services/api-key.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { id: string };
    }>();
    const apiKeyHeader =
      request.headers['x-api-key'] || request.headers['authorization'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('Missing API Key');
    }

    let token = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    const userId = await this.apiKeyService.verifyAndGetUserId(token);

    if (!userId) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Attach userId to request for the controller to use
    request.user = { id: userId };

    return true;
  }
}
