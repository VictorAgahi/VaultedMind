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
import { AIChatService } from '../application/services/ai-chat.service.js';
import { AIChatController } from './controllers/ai-chat.controller.js';
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
    AIChatService,
  ],
  controllers: [AIInsightController, AIChatController],
  exports: [AIInsightService],
})
export class AIInsightsModule {}
