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
import { FieldValueService } from '../../application/services/field-value.service.js';
import {
  SaveFieldValueDto,
  UpdateFieldValueDto,
  FieldValueResponseDto,
} from '../../application/dtos/field-value.dto.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { FieldValue } from '../../domain/entities/field-value.entity.js';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

@Controller('health/daily-logs/:logId/values')
@UseGuards(JwtAuthGuard)
export class FieldValueController {
  constructor(private readonly fieldValueService: FieldValueService) {}

  @Post()
  async save(
    @Param('logId') logId: string,
    @Body() dto: SaveFieldValueDto,
  ): Promise<FieldValueResponseDto> {
    const entity = new FieldValue(
      uuidv4(),
      logId,
      dto.customFieldId,
      dto.value,
      new Date(),
      new Date(),
    );

    const saved = await this.fieldValueService.saveValue(entity);
    return this.mapToResponse(saved);
  }

  @Get()
  async findByLog(
    @Param('logId') logId: string,
  ): Promise<FieldValueResponseDto[]> {
    const values = await this.fieldValueService.findByDailyLogId(logId);
    return values.map((v) => this.mapToResponse(v));
  }

  @Patch(':valueId')
  async update(
    @Param('valueId') valueId: string,
    @Body() dto: UpdateFieldValueDto,
    @Req() req: { user: AuthUser },
  ): Promise<FieldValueResponseDto> {
    const updated = await this.fieldValueService.updateValue(
      valueId,
      req.user.id,
      dto.value,
    );
    return this.mapToResponse(updated);
  }

  @Delete(':valueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('valueId') valueId: string,
    @Req() req: { user: AuthUser },
  ): Promise<void> {
    await this.fieldValueService.deleteValue(valueId, req.user.id);
  }

  private mapToResponse(entity: FieldValue): FieldValueResponseDto {
    return {
      id: entity.id,
      dailyLogId: entity.dailyLogId,
      customFieldId: entity.customFieldId,
      value: entity.value,
      createdAt: entity.createdAt,
    };
  }
}
