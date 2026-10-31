import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { HealthBatchSyncService } from '../../application/services/health-batch-sync.service.js';
import {
  HealthSyncTokenService,
  IssuedSyncToken,
} from '../../application/services/health-sync-token.service.js';
import {
  HealthBatchDto,
  HealthBatchResult,
} from '../../application/dtos/health-batch.dto.js';
import { SyncTokenOrApiKeyGuard } from '../guards/sync-token-or-api-key.guard.js';

@Controller('integrations/health')
export class HealthBatchController {
  constructor(
    private readonly syncTokenService: HealthSyncTokenService,
    private readonly batchSyncService: HealthBatchSyncService,
  ) {}

  @Post('sync-token')
  @UseGuards(JwtAuthGuard)
  async issueSyncToken(
    @Req() req: { user: { id: string } },
  ): Promise<IssuedSyncToken> {
    return this.syncTokenService.issue(req.user.id);
  }

  @Post('batch')
  @UseGuards(SyncTokenOrApiKeyGuard)
  async batch(
    @Req() req: { user: { id: string } },
    @Body() dto: HealthBatchDto,
  ): Promise<HealthBatchResult> {
    return this.batchSyncService.sync(req.user.id, dto);
  }
}
