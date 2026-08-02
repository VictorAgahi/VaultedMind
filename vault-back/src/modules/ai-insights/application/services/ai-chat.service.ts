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

  async getChatResponse(
    userId: string,
    userMessage: string,
  ): Promise<{
    response: string;
    suggestedActions?: Record<string, unknown>[];
  }> {
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
7. Quand une durée apparaît, écris-la en format humain : 5h30, 2h15, 45 min. Jamais 5.5 h.

ACTIONS PROACTIVES :
Tu peux suggérer des modifications au formulaire de l'utilisateur pour mieux organiser ses données ou tracker de nouvelles habitudes.
Si tu détectes des champs redondants, inutilisés, ou qu'il manque des champs pertinents, ou si l'utilisateur te demande de l'aide pour s'organiser, tu DOIS générer à la toute fin de ta réponse un bloc JSON encadré par <action_suggestions> et </action_suggestions>.

Exemple de format :
<action_suggestions>
[
  {
    "type": "CREATE_FIELD",
    "name": "Nouveau champ",
    "fieldType": "NUMBER",
    "category": "Catégorie suggérée",
    "reason": "Explication de pourquoi créer ce champ"
  },
  {
    "type": "DEACTIVATE_FIELD",
    "id": "id-du-champ-existant",
    "name": "Nom du champ",
    "reason": "Il n'est jamais rempli"
  },
  {
    "type": "UPDATE_CATEGORY",
    "id": "id-du-champ-existant",
    "name": "Nom du champ",
    "category": "Nouvelle catégorie",
    "reason": "Pour mieux organiser les données"
  }
]
</action_suggestions>`;

      const prompt = `Message de l'utilisateur : "${userMessage}"\n\nAssistant, réponds à l'utilisateur :`;

      const rawResponse = await this.llmService.generateTextWithConfig(
        `${systemPrompt}\n\n${prompt}`,
        {
          model: 'gpt-5.5',
          maxTokens: 2000,
        },
      );

      // Parse action suggestions
      let suggestedActions: Record<string, unknown>[] | undefined = undefined;
      let cleanResponse = rawResponse;

      const suggestionRegex =
        /<action_suggestions>([\s\S]*?)<\/action_suggestions>/;
      const match = rawResponse.match(suggestionRegex);

      if (match && match[1]) {
        try {
          const jsonStr = match[1].replace(/```(?:json)?/gi, '').trim();
          suggestedActions = JSON.parse(jsonStr) as Record<string, unknown>[];
          cleanResponse = rawResponse.replace(suggestionRegex, '').trim();
        } catch (e) {
          this.logger.warn(
            'Failed to parse suggested actions JSON from AI response',
            e,
          );
        }
      }

      return { response: cleanResponse, suggestedActions };
    } catch (error) {
      this.logger.error(`Error in AIChatService for user ${userId}:`, error);
      return {
        response:
          'Désolé, je rencontre une petite difficulté technique pour analyser vos données. Réessayez dans un instant.',
      };
    }
  }
}
