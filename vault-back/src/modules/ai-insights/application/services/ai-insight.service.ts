import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AIInsightRepository } from '../../../../database/repositories/ai-insight.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AIInsight } from '../../domain/entities/ai-insight.entity.js';
import { InsightType } from '../../domain/enums/insight-type.enum.js';
import { DataSanitizerService } from './data-sanitizer.service.js';
import { PromptService } from './prompt.service.js';
import { LLMService } from './llm.service.js';

@Injectable()
export class AIInsightService {
  private readonly logger = new Logger(AIInsightService.name);

  constructor(
    private readonly aiInsightRepository: AIInsightRepository,
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSanitizer: DataSanitizerService,
    private readonly promptService: PromptService,
    private readonly llmService: LLMService,
  ) {}

  async generateInsightForUser(userId: string): Promise<AIInsight | null> {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user.aiInsightsEnabled) {
        this.logger.debug(`AI insights disabled for user ${userId}`);
        return null;
      }

      const allLogs = await this.dailyLogRepository.findByUserId(userId);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogs = allLogs.filter(
        (log) => new Date(log.logDate) >= thirtyDaysAgo,
      );

      if (recentLogs.length === 0) {
        this.logger.debug(`No recent logs for user ${userId}`);
        return null;
      }

      const fields = await this.customFieldRepository.findByUserId(userId);
      if (fields.length === 0) {
        return null;
      }

      const sanitizedData = this.dataSanitizer.sanitizeLogsForAI(
        recentLogs,
        fields,
      );

      const today = new Date().getDay();
      let insightType = InsightType.DAILY_SUMMARY;
      if (today === 1) {
        insightType = InsightType.WEEKLY_TREND;
      }

      const prompt = this.promptService.generatePrompt(
        insightType,
        sanitizedData,
      );

      this.logger.log(
        `Generating ${insightType} insight for user ${userId}...`,
      );
      const content = await this.llmService.generateText(prompt, 400);

      const title =
        insightType === InsightType.WEEKLY_TREND
          ? 'Analyse hebdomadaire du bien-être'
          : 'Résumé quotidien du bien-être';

      const insight = new AIInsight(
        uuidv4(),
        userId,
        insightType,
        title,
        content,
        { logsAnalyzed: recentLogs.length },
        new Date(),
        new Date(),
      );

      const saved = await this.aiInsightRepository.saveDomain(insight);
      this.logger.log(`Insight generated successfully for user ${userId}`);

      return saved;
    } catch (error) {
      this.logger.error(`Error generating insight for user ${userId}:`, error);
      return null;
    }
  }

  async getInsightsForUser(
    userId: string,
    limit: number = 5,
  ): Promise<AIInsight[]> {
    return this.aiInsightRepository.findByUserId(userId, limit);
  }

  async enableAIInsights(userId: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    user.aiInsightsEnabled = true;
    await this.userRepository.saveUser(user);
    this.logger.log(`AI insights enabled for user ${userId}`);
  }

  async disableAIInsights(userId: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    user.aiInsightsEnabled = false;
    await this.userRepository.saveUser(user);
    this.logger.log(`AI insights disabled for user ${userId}`);
  }

  async getAIInsightsStatus(userId: string): Promise<boolean> {
    const user = await this.userRepository.findUserById(userId);
    return user.aiInsightsEnabled;
  }

  async deleteAIInsight(userId: string, insightId: string): Promise<void> {
    await this.aiInsightRepository.delete(insightId, userId);
    this.logger.log(`Insight ${insightId} deleted for user ${userId}`);
  }
}
