import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BulkImportService } from '../../application/services/bulk-import.service.js';
import {
  BulkImportDto,
  BulkImportResponseDto,
} from '../../application/dtos/bulk-import.dto.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

@Controller('health/import')
@UseGuards(JwtAuthGuard)
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post()
  async importCsv(
    @Body() dto: BulkImportDto,
    @Req() req: { user: AuthUser },
  ): Promise<BulkImportResponseDto> {
    return this.bulkImportService.importRows(req.user.id, dto.rows);
  }
}
