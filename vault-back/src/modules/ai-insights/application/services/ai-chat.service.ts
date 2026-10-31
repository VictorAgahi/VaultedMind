import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { linkedFieldMeasures } from '../../../patterns/domain/pattern-sources.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { PatternReportRepository } from '../../../../database/repositories/pattern-report.repository.js';
import {
  canUseEngineBrief,
  renderSolidFindingsForChat,
} from '../../../patterns/domain/pattern-brief.js';
import { subjectBlock } from '../../domain/services/subject-prompt.js';
import { ENGINE_FIGURES_RULES } from './prompt.service.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import {
  AIChatUsageRepository,
  AIChatUsageStatus,
} from '../../../../database/repositories/ai-chat-usage.repository.js';
import { DataSanitizerService } from './data-sanitizer.service.js';
import { LLMService } from './llm.service.js';
import { assessDistress } from '../../domain/services/distress-detector.js';
import {
  CRISIS_RESPONSE,
  SAFETY_GUIDELINES,
} from '../../domain/services/safety-guidelines.js';
import { AIConsentRequiredException } from '../../domain/exceptions/ai-consent-required.exception.js';
import type { AIChatTurnDto } from '../dtos/ai-insight.dto.js';

export interface AIChatReply {
  response: string;
  suggestedActions?: Record<string, unknown>[];
  remainingPrompts?: number;
  nextAvailableAt?: Date | null;
  /** True when the app must show crisis resources next to the reply. */
  safety?: boolean;
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly userRepository: UserRepository,
    private readonly aiChatUsageRepository: AIChatUsageRepository,
    private readonly patternReportRepository: PatternReportRepository,
    private readonly dataSanitizer: DataSanitizerService,
    private readonly llmService: LLMService,
  ) {}

  async getChatStatus(userId: string): Promise<AIChatUsageStatus> {
    return this.aiChatUsageRepository.getUsageStatus(userId);
  }

  async getChatResponse(
    userId: string,
    userMessage: string,
    history: AIChatTurnDto[] = [],
  ): Promise<AIChatReply> {
    const user = await this.userRepository.findUserById(userId);
    if (!user.aiInsightsEnabled || !user.hasGivenAIConsent()) {
      throw new AIConsentRequiredException();
    }

    // A person in crisis gets human resources right away: no quota, no model, no network dependency
    const distress = assessDistress([userMessage]);
    if (distress.level === 'crisis') {
      const status = await this.aiChatUsageRepository.getUsageStatus(userId);
      return {
        response: CRISIS_RESPONSE,
        safety: true,
        remainingPrompts: status.remaining,
        nextAvailableAt: status.nextAvailableAt,
      };
    }

    // Reserve a slot atomically before calling the LLM
    const { status: usageStatus, usageId } =
      await this.aiChatUsageRepository.tryReserve(userId, 'chat');
    if (!usageId) {
      const remainingHours = Math.floor(
        usageStatus.cooldownRemainingMs / (60 * 60 * 1000),
      );
      const remainingMinutes = Math.ceil(
        (usageStatus.cooldownRemainingMs % (60 * 60 * 1000)) / (60 * 1000),
      );
      const timeStr =
        remainingHours > 0
          ? `${remainingHours}h ${remainingMinutes}min`
          : `${remainingMinutes}min`;
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Limite de messages atteinte : vous avez droit à ${usageStatus.maxAllowed} questions toutes les 12 heures. Prochaine question disponible dans ${timeStr}.`,
          remainingPrompts: 0,
          nextAvailableAt: usageStatus.nextAvailableAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

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
          { includeNotes: user.preferences.aiIncludeNotes },
        );
        context = `Données de l'utilisateur sur les 60 derniers jours :\n${JSON.stringify(sanitizedData, null, 2)}`;
      } else {
        context = "L'utilisateur n'a pas encore assez de données enregistrées.";
      }

      const stored = await this.patternReportRepository.findByUserId(userId);
      const report = stored?.report ?? null;
      const solidFindings = canUseEngineBrief(
        report,
        user.preferences.insightsV2Enabled,
        new Date(),
      )
        ? renderSolidFindingsForChat(
            report,
            undefined,
            user.preferences.patternObviousOverrides,
            user.preferences.trackedSubject,
            linkedFieldMeasures(fields),
          )
        : null;
      const engineBlock = solidFindings
        ? `\n[LIENS SOLIDES CALCULÉS SUR SES DONNÉES]\n${solidFindings}\n\n${ENGINE_FIGURES_RULES.replace('(dossier AGENT 2)', '(liens ci-dessus)')}\n`
        : '';

      const userContext = user.aiContext
        ? `\n[CONTEXTE PERSONNALISÉ À RESPECTER : ${user.aiContext}]\n`
        : '';
      const subjectStatement = subjectBlock(user.preferences.trackedSubject);

      const systemPrompt = `Tu es l'assistant IA de VaultedMind, une application de suivi du bien-être mental. 
Ton rôle est d'aider l'utilisateur à comprendre ses données, à identifier des modèles et à lui donner des conseils bienveillants.
${userContext}${subjectStatement}
${context}
${engineBlock}
CONSIGNES :
1. Réponds de manière empathique, chaleureuse et professionnelle.
2. Basse tes réponses sur les données de l'utilisateur fournies ci-dessus si elles sont pertinentes pour sa question.
3. Sois concis et évite le jargon médical. Rappelle que tu n'es pas un médecin si nécessaire.
4. RÉPONDS TOUJOURS EN FRANÇAIS.
5. Quand tu cites des corrélations ou des tendances, sois précis sur les données qui les soutiennent.
6. N'hésite pas à proposer des hypothèses de corrélation entre les indicateurs si les données les soutiennent.
7. Quand une durée apparaît, écris-la en format humain : 5h30, 2h15, 45 min. Jamais 5.5 h.

${SAFETY_GUIDELINES}

ACTIONS PROACTIVES :
Tu peux suggérer des modifications au formulaire de l'utilisateur pour mieux organiser ses données ou tracker de nouvelles habitudes.
Si tu détectes des champs redondants, inutilisés, ou qu'il manque des champs pertinents, ou si l'utilisateur te demande de l'aide pour s'organiser, tu DOIS générer à la toute fin de ta réponse un bloc JSON encadré par <action_suggestions> et </action_suggestions>.

Exemple de format :
<action_suggestions>
[
  {
    "type": "CREATE_FIELD",
    "name": "Sommeil",
    "fieldType": "STRING", // OBLIGATOIRE: "STRING", "NUMBER", "BOOLEAN" ou "DATE"
    "category": "Sommeil",
    "options": ["Excellent", "Bon", "Moyen", "Mauvais"], // Optionnel: suggère des valeurs par défaut pertinentes (pour les champs STRING)
    "subFields": [
      {
        "triggerValue": "Mauvais",
        "name": "Pourquoi ?",
        "fieldType": "STRING",
        "options": ["Insomnie", "Stress", "Bruit", "Écran tardif", "Cauchemars", "Autre"]
      }
    ],
    "reason": "Explication de pourquoi créer ce champ avec des sous-champs conditionnels"
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

      const conversation = history
        .slice(-6)
        .map(
          (turn) =>
            `${turn.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${turn.content}`,
        )
        .join('\n');
      const conversationBlock = conversation
        ? `Échanges précédents (pour le contexte) :\n${conversation}\n\n`
        : '';
      const prompt = `${conversationBlock}Message de l'utilisateur : "${userMessage}"\n\nAssistant, réponds à l'utilisateur :`;

      const rawResponse = await this.llmService.generateTextWithConfig(
        `${systemPrompt}\n\n${prompt}`,
        {
          model: this.llmService.getChatModel(),
          maxTokens: 1500,
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
              if (
                obj.length > 0 &&
                obj[0] &&
                typeof obj[0] === 'object' &&
                'type' in obj[0]
              ) {
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
            // Resolve missing IDs by matching the name against the user's fields
            const validActions = [];
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            for (const action of actionsArray) {
              const act = action as Record<string, any>;
              if (
                act.type === 'UPDATE_CATEGORY' ||
                act.type === 'DEACTIVATE_FIELD'
              ) {
                const isValidId =
                  act.id &&
                  typeof act.id === 'string' &&
                  act.id.match(/^[0-9a-f]{8}-/i);
                if (!isValidId) {
                  const searchName = act.name || act.id;
                  if (typeof searchName === 'string') {
                    const field = fields.find(
                      (f) => f.name.toLowerCase() === searchName.toLowerCase(),
                    );
                    if (field) {
                      act.id = field.id;
                      act.name = field.name;
                    }
                  }
                }
                // Verify again after resolution
                if (
                  act.id &&
                  typeof act.id === 'string' &&
                  act.id.match(/^[0-9a-f]{8}-/i)
                ) {
                  validActions.push(act);
                }
              } else {
                validActions.push(act);
              }
            }
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */
            suggestedActions = validActions as Record<string, unknown>[];
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

      // Never log the model output: it contains health interpretations
      this.logger.log(
        `[AIChat] Reply generated for user ${userId} (${suggestedActions ? 'with' : 'without'} suggested actions)`,
      );

      return {
        response: cleanResponse,
        suggestedActions,
        remainingPrompts: Math.max(0, usageStatus.remaining - 1),
        nextAvailableAt: usageStatus.nextAvailableAt,
        safety: distress.level === 'concern' ? true : undefined,
      };
    } catch (error) {
      // The LLM call failed: give the slot back to the user
      await this.aiChatUsageRepository.release(usageId);
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error in AIChatService for user ${userId}:`, error);
      return {
        response:
          'Désolé, je rencontre une petite difficulté technique pour analyser vos données. Réessayez dans un instant.',
      };
    }
  }
}
