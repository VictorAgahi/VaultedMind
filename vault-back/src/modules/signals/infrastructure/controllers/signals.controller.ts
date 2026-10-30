import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import type { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { SignalsReadService } from '../../application/services/signals-read.service.js';
import { SaveSignalCorrectionsDto } from '../../application/dtos/signal-corrections.dto.js';
import type { SignalView } from '../../domain/signal-view.js';

@Controller('health/daily-logs')
@UseGuards(JwtAuthGuard)
export class SignalsController {
  constructor(private readonly signalsReadService: SignalsReadService) {}

  @Patch(':id/signals')
  async saveCorrections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveSignalCorrectionsDto,
    @Req() req: { user: AuthUser },
  ): Promise<{ signals: SignalView[] }> {
    const signals = await this.signalsReadService.saveCorrections(
      req.user.id,
      id,
      dto.corrections,
    );
    return { signals };
  }
}
