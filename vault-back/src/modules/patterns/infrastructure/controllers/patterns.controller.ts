import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import type { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import {
  PatternsService,
  type NotComputedReport,
} from '../../application/services/patterns.service.js';
import { ObviousOverrideDto } from '../../application/dtos/obvious-override.dto.js';
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

  @Post('obvious')
  @HttpCode(HttpStatus.OK)
  async setObvious(
    @Body() dto: ObviousOverrideDto,
    @Req() req: { user: AuthUser },
  ): Promise<{ findingKey: string; obvious: boolean | null }> {
    const obvious = dto.obvious ?? null;
    await this.patternsService.setObviousOverride(
      req.user.id,
      dto.findingKey,
      obvious,
    );
    return { findingKey: dto.findingKey, obvious };
  }

  @Get('field-values')
  async fieldValues(
    @Query('fieldId', new ParseUUIDPipe()) fieldId: string,
    @Req() req: { user: AuthUser },
  ): Promise<{ values: string[] }> {
    return {
      values: await this.patternsService.listFieldValues(req.user.id, fieldId),
    };
  }
}
