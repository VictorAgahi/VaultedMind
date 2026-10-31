import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModel } from './models/user.model.js';
import { CustomFieldModel } from './models/custom-field.model.js';
import { DailyLogModel } from './models/daily-log.model.js';
import { FieldValueModel } from './models/field-value.model.js';
import { AIInsightModel } from './models/ai-insight.model.js';
import { ApiKeyModel } from './models/api-key.model.js';
import { UserRepository } from './repositories/user.repository.js';
import { CustomFieldRepository } from './repositories/custom-field.repository.js';
import { DailyLogRepository } from './repositories/daily-log.repository.js';
import { FieldValueRepository } from './repositories/field-value.repository.js';
import { AIInsightRepository } from './repositories/ai-insight.repository.js';
import { HealthSyncTokenModel } from './models/health-sync-token.model.js';
import { HealthDailyMetricModel } from './models/health-daily-metric.model.js';
import { HealthSyncTokenRepository } from './repositories/health-sync-token.repository.js';
import { HealthDailyMetricRepository } from './repositories/health-daily-metric.repository.js';
import { ApiKeyRepository } from './repositories/api-key.repository.js';
import { AIChatUsageModel } from './models/ai-chat-usage.model.js';
import { AIChatUsageRepository } from './repositories/ai-chat-usage.repository.js';
import { NoteSignalsModel } from './models/note-signals.model.js';
import { NoteSignalsRepository } from './repositories/note-signals.repository.js';
import { PatternReportModel } from './models/pattern-report.model.js';
import { PatternReportRepository } from './repositories/pattern-report.repository.js';
import { UserMapper } from './mappers/user.mapper.js';
import { CustomFieldMapper } from './mappers/custom-field.mapper.js';
import { DailyLogMapper } from './mappers/daily-log.mapper.js';
import { FieldValueMapper } from './mappers/field-value.mapper.js';
import { AIInsightMapper } from './mappers/ai-insight.mapper.js';
import { ApiKeyMapper } from './mappers/api-key.mapper.js';

const models = [
  UserModel,
  CustomFieldModel,
  DailyLogModel,
  FieldValueModel,
  AIInsightModel,
  ApiKeyModel,
  HealthSyncTokenModel,
  HealthDailyMetricModel,
  AIChatUsageModel,
  NoteSignalsModel,
  PatternReportModel,
];

const repositories = [
  UserRepository,
  CustomFieldRepository,
  DailyLogRepository,
  FieldValueRepository,
  AIInsightRepository,
  ApiKeyRepository,
  HealthSyncTokenRepository,
  HealthDailyMetricRepository,
  AIChatUsageRepository,
  NoteSignalsRepository,
  PatternReportRepository,
];

const mappers = [
  UserMapper,
  CustomFieldMapper,
  DailyLogMapper,
  FieldValueMapper,
  AIInsightMapper,
  ApiKeyMapper,
];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(models)],
  providers: [...repositories, ...mappers],
  exports: [TypeOrmModule, ...repositories, ...mappers],
})
export class DatabaseModule {}
