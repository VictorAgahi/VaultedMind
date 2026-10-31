import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { HealthProposalsService } from '../../application/services/health-proposals.service.js';
import {
  AcceptHealthProposalDto,
  type HealthProposalAcceptResult,
  type HealthProposalsRunResult,
  type HealthProposalsView,
} from '../../application/dtos/health-proposals.dto.js';

const metricPipe = new ParseEnumPipe(AppleWatchMetric);

@Controller('integrations/health/proposals')
@UseGuards(JwtAuthGuard)
export class HealthProposalsController {
  constructor(private readonly proposalsService: HealthProposalsService) {}

  @Get()
  async list(@Req() req: { user: AuthUser }): Promise<HealthProposalsView> {
    return this.proposalsService.list(req.user.id);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Req() req: { user: AuthUser }): Promise<HealthProposalsRunResult> {
    return this.proposalsService.run(req.user.id);
  }

  @Post(':metric/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('metric', metricPipe) metric: AppleWatchMetric,
    @Body() dto: AcceptHealthProposalDto,
    @Req() req: { user: AuthUser },
  ): Promise<HealthProposalAcceptResult> {
    return this.proposalsService.accept(req.user.id, metric, dto ?? {});
  }

  @Post(':metric/ignore')
  @HttpCode(HttpStatus.OK)
  async ignore(
    @Param('metric', metricPipe) metric: AppleWatchMetric,
    @Req() req: { user: AuthUser },
  ): Promise<{ pendingCount: number }> {
    return this.proposalsService.ignore(req.user.id, metric);
  }

  @Post(':metric/unignore')
  @HttpCode(HttpStatus.OK)
  async unignore(
    @Param('metric', metricPipe) metric: AppleWatchMetric,
    @Req() req: { user: AuthUser },
  ): Promise<HealthProposalsRunResult> {
    return this.proposalsService.unignore(req.user.id, metric);
  }
}
