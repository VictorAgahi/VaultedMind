import { Module } from '@nestjs/common';
import { CustomFieldService } from '../application/services/custom-field.service.js';
import { DailyLogService } from '../application/services/daily-log.service.js';
import { FieldValueService } from '../application/services/field-value.service.js';
import { BulkImportService } from '../application/services/bulk-import.service.js';
import { CustomFieldController } from './controllers/custom-field.controller.js';
import { DailyLogController } from './controllers/daily-log.controller.js';
import { FieldValueController } from './controllers/field-value.controller.js';
import { BulkImportController } from './controllers/bulk-import.controller.js';
import { HealthCheckController } from './controllers/health-check.controller.js';
import { HealthSyncService } from '../application/services/health-sync.service.js';
import { HealthSyncController } from './controllers/health-sync.controller.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [
    CustomFieldService,
    DailyLogService,
    FieldValueService,
    BulkImportService,
    HealthSyncService,
  ],
  controllers: [
    HealthCheckController,
    CustomFieldController,
    DailyLogController,
    FieldValueController,
    BulkImportController,
    HealthSyncController,
  ],
  exports: [
    CustomFieldService,
    DailyLogService,
    FieldValueService,
    BulkImportService,
    HealthSyncService,
  ],
})
export class HealthModule {}
