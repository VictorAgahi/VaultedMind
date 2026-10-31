import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../../ai-insights/application/services/llm.service.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import {
  buildHealthLinkingSchema,
  parseHealthLinkingReply,
  type LinkingSuggestions,
} from '../../domain/services/health-linking-schema.js';
import { buildFallbackSuggestions } from '../../domain/services/health-linking-fallback.js';
import type { LinkingCandidateField } from '../../domain/services/health-linking-validation.js';
import {
  buildHealthLinkingPrompt,
  type LinkingPromptField,
  type LinkingPromptMetric,
} from './health-linking-prompt.js';

const LINKING_BASE_TOKENS = 300;
const LINKING_TOKENS_PER_METRIC = 120;
const LINKING_MAX_TOKENS = 3000;

export type LinkingField = LinkingCandidateField & LinkingPromptField;

export interface LinkingSuggestionResult {
  suggestions: LinkingSuggestions;
  /** 'ai' when the mini model answered, 'rules' for the deterministic matching. */
  origin: 'ai' | 'rules';
}

/**
 * Suggests, for metrics without a field, a field of the user or a new field: one call to
 * the mini model when the user consented to AI, the deterministic matching otherwise or
 * when the call fails.
 */
@Injectable()
export class HealthLinkingSuggesterService {
  private readonly logger = new Logger(HealthLinkingSuggesterService.name);

  constructor(private readonly llmService: LLMService) {}

  async suggest(
    user: User,
    metrics: LinkingPromptMetric[],
    fields: LinkingField[],
  ): Promise<LinkingSuggestionResult> {
    const metricIds = metrics.map((entry) => entry.metric);
    if (!user.aiInsightsEnabled || !user.hasGivenAIConsent()) {
      return {
        suggestions: buildFallbackSuggestions(metricIds, fields),
        origin: 'rules',
      };
    }

    // Only fields free to receive a metric can be chosen; linked ones are shown for context
    const linkableIds = fields
      .filter((field) => !field.appleWatchMetric)
      .map((field) => field.id);
    try {
      const reply = await this.llmService.generateStructured(
        buildHealthLinkingPrompt(fields, metrics),
        {
          model: this.llmService.getMiniModel(),
          maxTokens: Math.min(
            LINKING_MAX_TOKENS,
            LINKING_BASE_TOKENS + LINKING_TOKENS_PER_METRIC * metrics.length,
          ),
          reasoningEffort: 'low',
          schemaName: 'health_field_linking',
          schema: buildHealthLinkingSchema(metricIds, linkableIds),
        },
      );
      return {
        suggestions: parseHealthLinkingReply(reply, metricIds),
        origin: 'ai',
      };
    } catch (error) {
      this.logger.warn(
        `Health linking model unavailable, rules used instead: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return {
        suggestions: buildFallbackSuggestions(metricIds, fields),
        origin: 'rules',
      };
    }
  }
}
