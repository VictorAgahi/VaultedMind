import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import type { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import {
  PatternsService,
  type NotComputedReport,
} from '../../application/services/patterns.service.js';
import type { PatternReportView } from '../../domain/pattern-report-view.js';

@Controller('insights/patterns')
@UseGuards(JwtAuthGuard)
export class PatternsController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get()
  async getReport(
    @Req() req: { user: AuthUser },
  ): Promise<PatternReportView | NotComputedReport> {
    return this.patternsService.getReport(req.user.id);
  }

  @Post('recompute')
  async recompute(@Req() req: { user: AuthUser }): Promise<PatternReportView> {
    return this.patternsService.recompute(req.user.id);
  }
}
