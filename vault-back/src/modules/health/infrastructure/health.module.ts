import { Module } from '@nestjs/common';
import { CustomFieldService } from '../application/services/custom-field.service.js';
import { AutofillFieldsService } from '../application/services/autofill-fields.service.js';
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
import { HealthBatchSyncService } from '../application/services/health-batch-sync.service.js';
import { HealthSyncTokenService } from '../application/services/health-sync-token.service.js';
import { HealthBatchController } from './controllers/health-batch.controller.js';
import { SyncTokenOrApiKeyGuard } from './guards/sync-token-or-api-key.guard.js';
import { HealthProposalsController } from './controllers/health-proposals.controller.js';
import { HealthFieldLinkerService } from '../application/services/health-field-linker.service.js';
import { HealthLinkingSuggesterService } from '../application/services/health-linking-suggester.service.js';
import { HealthLinkingAssistantService } from '../application/services/health-linking-assistant.service.js';
import { HealthProposalsService } from '../application/services/health-proposals.service.js';
import { LLMService } from '../../ai-insights/application/services/llm.service.js';
import { SignalsModule } from '../../signals/infrastructure/signals.module.js';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';

@Module({
  imports: [AuthModule, SignalsModule],
  providers: [
    CustomFieldService,
    DailyLogService,
    AutofillFieldsService,
    FieldValueService,
    BulkImportService,
    HealthSyncService,
    HealthSyncTokenService,
    HealthBatchSyncService,
    HealthFieldLinkerService,
    HealthLinkingSuggesterService,
    HealthLinkingAssistantService,
    HealthProposalsService,
    LLMService,
    SyncTokenOrApiKeyGuard,
  ],
  controllers: [
    HealthCheckController,
    CustomFieldController,
    DailyLogController,
    FieldValueController,
    BulkImportController,
    HealthSyncController,
    HealthBatchController,
    HealthProposalsController,
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
