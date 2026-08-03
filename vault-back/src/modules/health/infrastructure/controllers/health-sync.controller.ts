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
    // TEMPORARY DEBUG LOG for the user to see what is received
    console.log(
      `[DEBUG - Apple Health Sync] User ${req.user.id} sent:`,
      JSON.stringify(dto, null, 2),
    );

    await this.healthSyncService.syncAppleWatchData(
      req.user.id,
      dto.metric,
      dto.value,
      dto.date,
    );

    return { success: true };
  }
}
