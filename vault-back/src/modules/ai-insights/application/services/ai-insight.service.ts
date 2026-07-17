import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AIInsightRepository } from '../../../../database/repositories/ai-insight.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AIInsight } from '../../domain/entities/ai-insight.entity.js';
import { InsightType } from '../../domain/enums/insight-type.enum.js';
import { DataSanitizerService } from './data-sanitizer.service.js';
import { PromptService, AgentEvidenceBundle } from './prompt.service.js';
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

  // ════════════════════════════════════════════════════════════════════════════
  //  MAIN PIPELINE — 6 AGENTS ORCHESTRATION
  // ════════════════════════════════════════════════════════════════════════════

  async generateInsightForUser(userId: string): Promise<AIInsight | null> {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user.aiInsightsEnabled) {
        this.logger.debug(`AI insights disabled for user ${userId}`);
        return null;
      }

      if (user.isGeneratingInsights) {
        throw new Error('Une analyse est déjà en cours de génération.');
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

      // Check if an insight was already generated today
      const recentInsights = await this.aiInsightRepository.findByUserId(userId, 1);
      if (recentInsights.length > 0) {
        const lastInsightDate = new Date(recentInsights[0].createdAt);
        const todayDate = new Date();
        if (
          lastInsightDate.getDate() === todayDate.getDate() &&
          lastInsightDate.getMonth() === todayDate.getMonth() &&
          lastInsightDate.getFullYear() === todayDate.getFullYear()
        ) {
          throw new Error('Vous avez déjà généré une analyse aujourd\'hui.');
        }
      }

      user.isGeneratingInsights = true;
      await this.userRepository.saveUser(user);

      let insightType = InsightType.DAILY_SUMMARY;
      const today = new Date();
      if (today.getDate() === 1) {
        insightType = InsightType.MONTHLY_TREND;
      }

      const useGpt55 = insightType !== InsightType.MONTHLY_TREND;

      const promptParams = {
        logs: sanitizedData,
        userContext: user.aiContext || undefined,
      };

      const startTime = Date.now();
      this.logger.log(
        `🚀 Starting 6-agent pipeline for user ${userId} (${insightType})...`,
      );

      // ── PHASE 1 : PARALLEL — Agents 1 + 2 + 3 ────────────────────────────
      this.logger.log(`[Phase 1] Launching agents 1-3 in parallel...`);

      const [analysisBrief, correlationBrief, contextBrief] = await Promise.all(
        [
          this.runAgent1DataAnalyst(insightType, promptParams, useGpt55),
          this.runAgent2CorrelationEngine(promptParams, useGpt55),
          this.runAgent3ContextInterpreter(promptParams, useGpt55),
        ],
      );

      this.logger.log(
        `[Phase 1] Complete — ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      );

      const evidence: AgentEvidenceBundle = {
        analysisBrief,
        correlationBrief,
        contextBrief,
      };

      // ── PHASE 2 : SEQUENTIAL — Agent 4 (Prediction) ──────────────────────
      this.logger.log(`[Phase 2] Agent 4 — Prediction Strategist...`);

      evidence.predictionBrief = await this.runAgent4PredictionStrategist(
        promptParams,
        evidence,
        useGpt55,
      );

      this.logger.log(
        `[Phase 2] Complete — ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      );

      // ── PHASE 3 : SEQUENTIAL — Agent 5 (Quality Gate) ────────────────────
      this.logger.log(`[Phase 3] Agent 5 — Quality Gate...`);

      evidence.qualityReview = await this.runAgent5QualityGate(
        promptParams,
        evidence,
        useGpt55,
      );

      this.logger.log(
        `[Phase 3] Complete — ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      );

      // ── PHASE 4 : SEQUENTIAL — Agent 6 (Narrative Synthesizer) ────────────
      this.logger.log(`[Phase 4] Agent 6 — Narrative Synthesizer...`);

      const content = await this.runAgent6NarrativeSynthesizer(
        insightType,
        promptParams,
        evidence,
        useGpt55,
      );

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `✅ 6-agent pipeline complete for user ${userId} in ${totalTime}s`,
      );

      // ── SAVE INSIGHT ──────────────────────────────────────────────────────
      const title =
        insightType === InsightType.MONTHLY_TREND
          ? 'Analyse mensuelle du bien-être'
          : 'Résumé quotidien du bien-être';

      const insight = new AIInsight(
        uuidv4(),
        userId,
        insightType,
        title,
        content,
        {
          logsAnalyzed: recentLogs.length,
          agentsPipelineVersion: '2.0',
          agentsUsed: 6,
          pipelineDurationSeconds: parseFloat(totalTime),
          model: useGpt55 ? 'gpt-5.5' : 'gpt-5.6-sol',
        },
        new Date(),
        new Date(),
      );

      const saved = await this.aiInsightRepository.saveDomain(insight);
      this.logger.log(`Insight generated successfully for user ${userId}`);

      return saved;
    } catch (error) {
      this.logger.error(`Error generating insight for user ${userId}:`, error);
      throw error;
    } finally {
      const userToUpdate = await this.userRepository.findUserById(userId);
      if (userToUpdate && userToUpdate.isGeneratingInsights) {
        userToUpdate.isGeneratingInsights = false;
        await this.userRepository.saveUser(userToUpdate);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  INDIVIDUAL AGENT RUNNERS
  // ════════════════════════════════════════════════════════════════════════════

  private async runAgent1DataAnalyst(
    insightType: InsightType,
    promptParams: { logs: unknown; userContext?: string },
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generateAnalysisBriefPrompt(
      insightType,
      promptParams as Parameters<
        typeof this.promptService.generateAnalysisBriefPrompt
      >[1],
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getAnalysisModel(),
      maxTokens: 100000,
      reasoningEffort: 'max',
    });
  }

  private async runAgent2CorrelationEngine(
    promptParams: { logs: unknown; userContext?: string },
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generateCorrelationPrompt(
      promptParams as Parameters<
        typeof this.promptService.generateCorrelationPrompt
      >[0],
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getCorrelationModel(),
      maxTokens: 100000,
      reasoningEffort: 'max',
    });
  }

  private async runAgent3ContextInterpreter(
    promptParams: { logs: unknown; userContext?: string },
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generateContextInterpretationPrompt(
      promptParams as Parameters<
        typeof this.promptService.generateContextInterpretationPrompt
      >[0],
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getContextModel(),
      maxTokens: 100000,
      reasoningEffort: 'high',
    });
  }

  private async runAgent4PredictionStrategist(
    promptParams: { logs: unknown; userContext?: string },
    evidence: AgentEvidenceBundle,
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generatePredictionPrompt(
      promptParams as Parameters<
        typeof this.promptService.generatePredictionPrompt
      >[0],
      evidence,
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getPredictionModel(),
      maxTokens: 100000,
      reasoningEffort: 'max',
    });
  }

  private async runAgent5QualityGate(
    promptParams: { logs: unknown; userContext?: string },
    evidence: AgentEvidenceBundle,
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generateQualityGatePrompt(
      promptParams as Parameters<
        typeof this.promptService.generateQualityGatePrompt
      >[0],
      evidence,
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getQualityModel(),
      maxTokens: 100000,
      reasoningEffort: 'high',
    });
  }

  private async runAgent6NarrativeSynthesizer(
    insightType: InsightType,
    promptParams: { logs: unknown; userContext?: string },
    evidence: AgentEvidenceBundle,
    useGpt55: boolean,
  ): Promise<string> {
    const prompt = this.promptService.generateInsightNarrativePrompt(
      insightType,
      promptParams as Parameters<
        typeof this.promptService.generateInsightNarrativePrompt
      >[1],
      null,
      evidence,
    );
    return this.llmService.generateTextWithConfig(prompt, {
      model: useGpt55 ? 'gpt-5.5' : this.llmService.getSynthesisModel(),
      maxTokens: 100000,
      reasoningEffort: 'max',
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  CRUD OPERATIONS (unchanged)
  // ════════════════════════════════════════════════════════════════════════════

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

    const optimized = await this.llmService.generateTextWithConfig(prompt, {
      model: this.llmService.getAnalysisModel(),
      maxTokens: 100000,
      reasoningEffort: 'high',
    });
    return optimized.trim();
  }

  async deleteAIInsight(userId: string, insightId: string): Promise<void> {
    await this.aiInsightRepository.delete(insightId, userId);
    this.logger.log(`Insight ${insightId} deleted for user ${userId}`);
  }
}
