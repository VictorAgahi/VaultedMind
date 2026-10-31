import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { AIChatUsageRepository } from '../../../../database/repositories/ai-chat-usage.repository.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import { pseudonymize } from '../../../signals/domain/pseudonymize.js';
import { isAutofillEligible } from '../../../health/domain/services/autofill-eligibility.js';
import {
  buildAutofillSchema,
  type AutofillSchemaField,
} from '../../../health/domain/services/autofill-schema.js';
import {
  isQuoteInText,
  parseAutofillReply,
  verifyAutofillAnswers,
  type AutofillProposal,
} from '../../../health/domain/services/autofill-verification.js';
import { LLMService } from './llm.service.js';
import { buildAutofillPrompt } from './autofill-prompt.js';
import { assertNotesConsent, reserveDailyUsage } from './ai-assist-guards.js';

const AUTOFILL_BASE_TOKENS = 400;
const AUTOFILL_TOKENS_PER_FIELD = 80;
const AUTOFILL_MAX_TOKENS = 8000;

export interface AutofillDraft {
  proposals: AutofillProposal[];
  /** Active fields that were not examined: not eligible for the story autofill. */
  skippedFieldIds: string[];
}

/**
 * Reads a story of the day (a transcript or a typed note) and proposes values only for the
 * factual fields the author stated explicitly. Nothing is saved: the user validates.
 */
@Injectable()
export class AutofillDraftService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly usageRepository: AIChatUsageRepository,
    private readonly llmService: LLMService,
  ) {}

  async draft(
    userId: string,
    text: string,
    logDate: string,
  ): Promise<AutofillDraft> {
    const user = await this.userRepository.findUserById(userId);
    assertNotesConsent(user);

    const subject = user.preferences.trackedSubject;
    const context = {
      subjectKind: subject.kind,
      insightTargetFieldIds: new Set(
        user.preferences.insightTargets.map((target) => target.fieldId),
      ),
    };
    const activeFields = (
      await this.customFieldRepository.findByUserId(userId)
    ).filter((field) => field.isActive);
    const eligible = activeFields.filter((field) =>
      isAutofillEligible(field, context),
    );
    const eligibleIds = new Set(eligible.map((field) => field.id));
    const skippedFieldIds = activeFields
      .filter((field) => !eligibleIds.has(field.id))
      .map((field) => field.id);
    if (eligible.length === 0) {
      return { proposals: [], skippedFieldIds };
    }

    const schemaFields: AutofillSchemaField[] = eligible.map((field) => ({
      id: field.id,
      name: field.name,
      fieldType: field.fieldType,
      optionsOrder: field.optionsOrder,
      min: field.min ?? undefined,
      max: field.max ?? undefined,
      isClockTime:
        field.fieldType === FieldType.NUMBER &&
        (field.optionsOrder ?? []).includes('isHourly'),
    }));
    // Names of people are replaced before the story leaves the server, as for the other AI calls
    const outgoingText = pseudonymize(text, user.preferences.people);

    const usageId = await reserveDailyUsage(
      this.usageRepository,
      userId,
      'autofill',
      'remplissages automatiques',
    );

    let rawReply: string;
    try {
      rawReply = await this.llmService.generateStructured(
        buildAutofillPrompt(outgoingText, schemaFields, logDate, subject),
        {
          model: this.llmService.getMiniModel(),
          maxTokens: Math.min(
            AUTOFILL_MAX_TOKENS,
            AUTOFILL_BASE_TOKENS +
              AUTOFILL_TOKENS_PER_FIELD * schemaFields.length,
          ),
          reasoningEffort: 'low',
          schemaName: 'daily_autofill',
          schema: buildAutofillSchema(schemaFields),
        },
      );
    } catch {
      await this.usageRepository.release(usageId);
      throw new ServiceUnavailableException(
        'Le remplissage automatique est momentanément indisponible.',
      );
    }

    try {
      const answers = parseAutofillReply(rawReply, schemaFields);
      const proposals = verifyAutofillAnswers(
        answers,
        schemaFields,
        outgoingText,
      )
        // A quote must also be the author's own words, not a name replaced by its alias
        .filter((proposal) => isQuoteInText(proposal.quote, text));
      return { proposals, skippedFieldIds };
    } catch {
      await this.usageRepository.release(usageId);
      throw new ServiceUnavailableException(
        'Le remplissage automatique est momentanément indisponible.',
      );
    }
  }
}
