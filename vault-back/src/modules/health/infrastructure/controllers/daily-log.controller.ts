import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SignalsReadService } from '../../../signals/application/services/signals-read.service.js';
import type { SignalView } from '../../../signals/domain/signal-view.js';
import { DailyLogService } from '../../application/services/daily-log.service.js';
import {
  SaveDailyEntryDto,
  CreateDailyLogDto,
  UpdateDailyLogDto,
  DailyLogResponseDto,
} from '../../application/dtos/daily-log.dto.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { DailyLog } from '../../domain/entities/daily-log.entity.js';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

@Controller('health/daily-logs')
@UseGuards(JwtAuthGuard)
export class DailyLogController {
  constructor(
    private readonly dailyLogService: DailyLogService,
    private readonly signalsReadService: SignalsReadService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateDailyLogDto,
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto> {
    const entity = new DailyLog(
      uuidv4(),
      req.user.id,
      new Date(dto.logDate),
      new Date(),
      new Date(),
      dto.notes,
    );

    const saved = await this.dailyLogService.createLog(entity);
    return this.respondWith(req.user.id, saved);
  }

  @Post('entry')
  async saveEntry(
    @Body() dto: SaveDailyEntryDto,
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto> {
    const saved = await this.dailyLogService.saveEntry({
      userId: req.user.id,
      logId: dto.logId,
      logDate: dto.logDate.slice(0, 10),
      notes: dto.notes,
      values: dto.values.filter((value) => value.value.trim() !== ''),
      clearedFieldIds: dto.clearedFieldIds ?? [],
    });
    return this.respondWith(req.user.id, saved);
  }

  @Get()
  async findAll(
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto[]> {
    const logs = await this.dailyLogService.findByUserId(req.user.id);
    const signals = await this.signalsReadService.forLogs(req.user.id, logs);
    return logs.map((l) => this.mapToResponse(l, signals.get(l.id) ?? null));
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto> {
    const log = await this.dailyLogService.findById(id, req.user.id);
    return this.respondWith(req.user.id, log);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto> {
    const updates: { logDate?: Date; notes?: string } = {
      ...(dto.logDate !== undefined && { logDate: new Date(dto.logDate) }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    };
    const updated = await this.dailyLogService.updateLog(
      id,
      req.user.id,
      updates,
    );
    return this.respondWith(req.user.id, updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: { user: AuthUser },
  ): Promise<void> {
    await this.dailyLogService.deleteLog(id, req.user.id);
  }

  private async respondWith(
    userId: string,
    log: DailyLog,
  ): Promise<DailyLogResponseDto> {
    const signals = await this.signalsReadService.forLogs(userId, [log]);
    return this.mapToResponse(log, signals.get(log.id) ?? null);
  }

  private mapToResponse(
    entity: DailyLog,
    signals: SignalView[] | null,
  ): DailyLogResponseDto {
    return {
      id: entity.id,
      logDate: entity.logDate,
      notes: entity.notes,
      notesClean: entity.notesClean ?? null,
      signals,
      createdAt: entity.createdAt,
      fieldValues: entity.fieldValues?.map((fv) => ({
        id: fv.id,
        dailyLogId: fv.dailyLogId,
        customFieldId: fv.customFieldId,
        value: fv.value,
        subValues: fv.subValues,
        source: fv.source ?? null,
        createdAt: fv.createdAt,
      })),
    };
  }
}
