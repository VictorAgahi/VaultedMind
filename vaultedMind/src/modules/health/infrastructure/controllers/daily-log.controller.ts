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
import { DailyLogService } from '../../application/services/daily-log.service.js';
import {
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
  constructor(private readonly dailyLogService: DailyLogService) {}

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
    return this.mapToResponse(saved);
  }

  @Get()
  async findAll(
    @Req() req: { user: AuthUser },
  ): Promise<DailyLogResponseDto[]> {
    const logs = await this.dailyLogService.findByUserId(req.user.id);
    return logs.map((l) => this.mapToResponse(l));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DailyLogResponseDto> {
    const log = await this.dailyLogService.findById(id);
    return this.mapToResponse(log);
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
    return this.mapToResponse(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: { user: AuthUser },
  ): Promise<void> {
    await this.dailyLogService.deleteLog(id, req.user.id);
  }

  private mapToResponse(entity: DailyLog): DailyLogResponseDto {
    return {
      id: entity.id,
      logDate: entity.logDate,
      notes: entity.notes,
      createdAt: entity.createdAt,
      fieldValues: entity.fieldValues?.map((fv) => ({
        id: fv.id,
        dailyLogId: fv.dailyLogId,
        customFieldId: fv.customFieldId,
        value: fv.value,
        createdAt: fv.createdAt,
      })),
    };
  }
}
