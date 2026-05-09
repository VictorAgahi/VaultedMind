import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { BulkImportService } from '../../application/services/bulk-import.service.js';
import { BulkImportDto, BulkImportResponseDto } from '../../application/dtos/bulk-import.dto.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';

@Controller('health/import')
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
