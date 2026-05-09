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

@Module({
  providers: [
    CustomFieldService,
    DailyLogService,
    FieldValueService,
    BulkImportService,
  ],
  controllers: [
    HealthCheckController,
    CustomFieldController,
    DailyLogController,
    FieldValueController,
    BulkImportController,
  ],
  exports: [
    CustomFieldService,
    DailyLogService,
    FieldValueService,
    BulkImportService,
  ],
})
export class HealthModule {}
