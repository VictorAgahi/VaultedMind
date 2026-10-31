import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIInsightModel } from '../../../database/models/ai-insight.model.js';
import { AIInsightRepository } from '../../../database/repositories/ai-insight.repository.js';
import { AIInsightMapper } from '../../../database/mappers/ai-insight.mapper.js';
import { AIInsightService } from '../application/services/ai-insight.service.js';
import { DataSanitizerService } from '../application/services/data-sanitizer.service.js';
import { PromptService } from '../application/services/prompt.service.js';
import { LLMService } from '../application/services/llm.service.js';
import { AIInsightController } from './controllers/ai-insight.controller.js';
import { AIInsightsCronService } from './cron/ai-insights-cron.service.js';
import { NoteCleanupCronService } from './cron/note-cleanup-cron.service.js';
import { NoteCleanupService } from '../application/services/note-cleanup.service.js';
import { AIChatService } from '../application/services/ai-chat.service.js';
import { AIChatController } from './controllers/ai-chat.controller.js';
import { DailyLogAssistController } from './controllers/daily-log-assist.controller.js';
import { VoiceTranscriptionService } from '../application/services/voice-transcription.service.js';
import { AutofillDraftService } from '../application/services/autofill-draft.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([AIInsightModel]), DatabaseModule],
  providers: [
    AIInsightRepository,
    AIInsightMapper,
    AIInsightService,
    DataSanitizerService,
    PromptService,
    LLMService,
    AIInsightsCronService,
    NoteCleanupService,
    NoteCleanupCronService,
    AIChatService,
    VoiceTranscriptionService,
    AutofillDraftService,
  ],
  controllers: [
    AIInsightController,
    AIChatController,
    DailyLogAssistController,
  ],
  exports: [AIInsightService],
})
export class AIInsightsModule {}
