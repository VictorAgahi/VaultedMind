import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { HealthSyncService } from '../../application/services/health-sync.service.js';
import { AppleHealthSyncDto } from '../../application/dtos/health-sync.dto.js';
import { ApiKeyGuard } from '../../../auth/infrastructure/guards/api-key.guard.js';

@Controller('integrations/health/sync')
export class HealthSyncController {
  constructor(private readonly healthSyncService: HealthSyncService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  async sync(
    @Req() req: { user: { id: string } },
    @Body() dto: AppleHealthSyncDto,
  ): Promise<{ success: boolean }> {
    await this.healthSyncService.syncAppleWatchData(
      req.user.id,
      dto.metric,
      dto.value,
      dto.date,
    );

    return { success: true };
  }
}
