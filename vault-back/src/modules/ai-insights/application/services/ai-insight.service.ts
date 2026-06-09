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

      if (recentLogs.length < 3) {
        this.logger.debug(
          `Too little data for user ${userId} (${recentLogs.length} logs, minimum 3 required)`,
        );
        return null;
      }

      const fields = await this.customFieldRepository.findByUserId(userId);
      const activeFields = fields.filter((f) => f.isActive);
      if (activeFields.length === 0) {
        this.logger.debug(`No active custom fields for user ${userId}`);
        return null;
      }

      const sanitizedData = this.dataSanitizer.sanitizeLogsForAI(
        recentLogs,
        activeFields,
      );

      const today = new Date().getDay();
      let insightType = InsightType.DAILY_SUMMARY;
      if (today === 1) {
        insightType = InsightType.WEEKLY_TREND;
      }

      const promptParams = {
        logs: sanitizedData,
        userContext: user.aiContext || undefined,
      };

      const analysisPrompt = this.promptService.generateAnalysisBriefPrompt(
        insightType,
        promptParams,
      );

      this.logger.log(
        `Generating ${insightType} analysis brief for user ${userId}...`,
      );
      const analysisBrief = await this.llmService.generateText(
        analysisPrompt,
        1500,
        this.llmService.getAnalysisModel(),
      );

      const finalPrompt = this.promptService.generateInsightNarrativePrompt(
        insightType,
        promptParams,
        analysisBrief,
      );

      this.logger.log(
        `Synthesizing ${insightType} insight for user ${userId}...`,
      );
      const content = await this.llmService.generateText(
        finalPrompt,
        3000,
        this.llmService.getSynthesisModel(),
      );

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

  async getAIContext(userId: string): Promise<string> {
    const user = await this.userRepository.findUserById(userId);
    return user.aiContext || '';
  }

  async updateAIContext(userId: string, context: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    user.aiContext = context;
    await this.userRepository.saveUser(user);
    this.logger.log(`AI context updated for user ${userId}`);
  }

  async optimizeAIContext(context: string): Promise<string> {
    const prompt = `Agis en tant qu'expert en ingénierie de prompt et psychologue comportementaliste.
L'utilisateur a saisi le contexte personnel suivant pour personnaliser ses analyses et les réponses de son assistant IA :
---
"${context}"
---
Optimise et structure ce texte de manière extrêmement claire, professionnelle, et percutante pour un grand modèle de langage (LLM).
Rédige le résultat directement sous forme de profil structuré en français (par exemple avec des sections comme "Profil", "Objectifs", "Style de communication souhaité").
Conserve absolument toutes les informations de base fournies par l'utilisateur mais enrichis-les pour que l'IA comprenne parfaitement son état d'esprit, ses contraintes et ses buts.
Ne mets aucune introduction ni conclusion, renvoie UNIQUEMENT le texte optimisé final prêt à être enregistré.`;

    const optimized = await this.llmService.generateText(
      prompt,
      500,
      this.llmService.getAnalysisModel(),
    );
    return optimized.trim();
  }

  async deleteAIInsight(userId: string, insightId: string): Promise<void> {
    await this.aiInsightRepository.delete(insightId, userId);
    this.logger.log(`Insight ${insightId} deleted for user ${userId}`);
  }
}
