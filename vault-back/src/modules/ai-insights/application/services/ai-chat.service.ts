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
</action_suggestions>

ATTENTION EXTRÊME : NE propose PAS les changements sous forme de texte, de liste ou de tableau markdown dans ta réponse. Tu dois OBLIGATOIREMENT et EXCLUSIVEMENT utiliser le bloc JSON dans les balises <action_suggestions> pour proposer ces modifications. Le système va lire ce JSON automatiquement pour afficher des boutons à l'utilisateur.`;

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

      const extractActions = (jsonStr: string): boolean => {
        try {
          const cleaned = jsonStr.replace(/```(?:json)?/gi, '').trim();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(cleaned);

          /* eslint-disable */
          const findActionsArray = (obj: any): any[] | null => {
            if (Array.isArray(obj)) {
              if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' && 'type' in obj[0]) {
                return obj;
              }
            } else if (obj && typeof obj === 'object') {
              if ('type' in obj && typeof obj.type === 'string') {
                return [obj];
              }
              for (const key of Object.keys(obj)) {
                const res = findActionsArray(obj[key]);
                if (res) return res;
              }
            }
            return null;
          };
          /* eslint-enable */

          const actionsArray = findActionsArray(parsed);
          if (actionsArray) {
            suggestedActions = actionsArray as Record<string, unknown>[];
            return true;
          }
        } catch {
          // Ignore parse errors
        }
        return false;
      };

      const suggestionRegex =
        /<action_suggestions>([\s\S]*?)<\/action_suggestions>/i;
      const match = rawResponse.match(suggestionRegex);

      if (match && match[1]) {
        if (extractActions(match[1])) {
          cleanResponse = rawResponse.replace(suggestionRegex, '').trim();
        } else {
          cleanResponse = rawResponse.replace(
            suggestionRegex,
            '```json\n$1\n```',
          );
        }
      } else {
        // Fallback: look for ```json ... ``` at the end of the text
        const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
        let jsonMatch;
        let lastMatch;
        while ((jsonMatch = jsonBlockRegex.exec(rawResponse)) !== null) {
          lastMatch = jsonMatch;
        }
        if (lastMatch && lastMatch[1]) {
          if (extractActions(lastMatch[1])) {
            cleanResponse = rawResponse.replace(lastMatch[0], '').trim();
          }
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
