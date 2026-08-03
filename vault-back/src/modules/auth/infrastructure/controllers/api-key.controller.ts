import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiKeyService } from '../../application/services/api-key.service.js';
import {
  CreateApiKeyDto,
  ApiKeyResponseDto,
} from '../../application/dtos/api-key.dto.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKeyResponseDto; secretKey: string }> {
    const result = await this.apiKeyService.create(req.user.id, dto.name);
    return {
      apiKey: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        createdAt: result.apiKey.createdAt,
        lastUsedAt: result.apiKey.lastUsedAt,
      },
      secretKey: result.secretKey,
    };
  }

  @Get()
  async findAll(
    @Req() req: { user: { id: string } },
  ): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyService.findAllForUser(req.user.id);
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    }));
  }

  @Delete(':id')
  async delete(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ): Promise<void> {
    await this.apiKeyService.delete(req.user.id, id);
  }
}
