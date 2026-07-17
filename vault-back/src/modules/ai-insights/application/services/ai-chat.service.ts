import { Injectable, Logger } from '@nestjs/common';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { DataSanitizerService } from './data-sanitizer.service.js';
import { LLMService } from './llm.service.js';

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSanitizer: DataSanitizerService,
    private readonly llmService: LLMService,
  ) {}

  async getChatResponse(userId: string, userMessage: string): Promise<string> {
    try {
      // Fetch recent logs for context (last 60 days for more depth)
      const allLogs = await this.dailyLogRepository.findByUserId(userId);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentLogs = allLogs.filter(
        (log) => new Date(log.logDate) >= sixtyDaysAgo,
      );

      const fields = await this.customFieldRepository.findByUserId(userId);

      let context = '';
      if (recentLogs.length > 0 && fields.length > 0) {
        const sanitizedData = this.dataSanitizer.sanitizeLogsForAI(
          recentLogs,
          fields,
        );
        context = `Données de l'utilisateur sur les 60 derniers jours :\n${JSON.stringify(sanitizedData, null, 2)}`;
      } else {
        context = "L'utilisateur n'a pas encore assez de données enregistrées.";
      }

      const user = await this.userRepository.findUserById(userId);
      const userContext = user.aiContext
        ? `\n[CONTEXTE PERSONNALISÉ À RESPECTER : ${user.aiContext}]\n`
        : '';

      const systemPrompt = `Tu es l'assistant IA de VaultedMind, une application de suivi du bien-être mental. 
Ton rôle est d'aider l'utilisateur à comprendre ses données, à identifier des modèles et à lui donner des conseils bienveillants.
${userContext}
${context}

CONSIGNES :
1. Réponds de manière empathique, chaleureuse et professionnelle.
2. Basse tes réponses sur les données de l'utilisateur fournies ci-dessus si elles sont pertinentes pour sa question.
3. Sois concis et évite le jargon médical. Rappelle que tu n'es pas un médecin si nécessaire.
4. RÉPONDS TOUJOURS EN FRANÇAIS.
5. Quand tu cites des corrélations ou des tendances, sois précis sur les données qui les soutiennent.
6. N'hésite pas à proposer des hypothèses de corrélation entre les indicateurs si les données les soutiennent.
7. Quand une durée apparaît, écris-la en format humain : 5h30, 2h15, 45 min. Jamais 5.5 h.`;

      const prompt = `Message de l'utilisateur : "${userMessage}"\n\nAssistant, réponds à l'utilisateur :`;

      return await this.llmService.generateTextWithConfig(
        `${systemPrompt}\n\n${prompt}`,
        {
          model: 'o4',
          maxTokens: 100000,
          reasoningEffort: 'high',
        },
      );
    } catch (error) {
      this.logger.error(`Error in AIChatService for user ${userId}:`, error);
      return 'Désolé, je rencontre une petite difficulté technique pour analyser vos données. Réessayez dans un instant.';
    }
  }
}
