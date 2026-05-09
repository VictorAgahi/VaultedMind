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
import { CustomFieldService } from '../../application/services/custom-field.service.js';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
} from '../../application/dtos/custom-field.dto.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

@Controller('health/custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  @Post()
  async create(
    @Body() dto: CreateCustomFieldDto,
    @Req() req: { user: AuthUser },
  ): Promise<CustomFieldResponseDto> {
    const entity = new CustomField(
      uuidv4(),
      req.user.id,
      dto.name,
      dto.fieldType,
      true,
      new Date(),
      new Date(),
    );

    const saved = await this.customFieldService.createField(entity);
    return this.mapToResponse(saved);
  }

  @Get()
  async findAll(
    @Req() req: { user: AuthUser },
  ): Promise<CustomFieldResponseDto[]> {
    const fields = await this.customFieldService.findByUserId(req.user.id);
    return fields.map((f) => this.mapToResponse(f));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CustomFieldResponseDto> {
    const field = await this.customFieldService.findById(id);
    return this.mapToResponse(field);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
    @Req() req: { user: AuthUser },
  ): Promise<CustomFieldResponseDto> {
    const updated = await this.customFieldService.updateField(
      id,
      req.user.id,
      dto,
    );
    return this.mapToResponse(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: { user: AuthUser },
  ): Promise<void> {
    await this.customFieldService.deleteField(id, req.user.id);
  }

  private mapToResponse(entity: CustomField): CustomFieldResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      fieldType: entity.fieldType,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    };
  }
}
