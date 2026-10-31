import { Injectable } from '@nestjs/common';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { HealthDailyMetricRepository } from '../../../../database/repositories/health-daily-metric.repository.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import type { CustomField } from '../../domain/entities/custom-field.entity.js';
import {
  AUTO_LINK_CONFIDENCE,
  countPendingDecisions,
  findLegacyLinkedFields,
  isLinkingStateOutdated,
  LINKING_STATE_VERSION,
  metricsAwaitingDecision,
  reconcileLinkingState,
  shouldRunAssistant,
  withDecision,
  type HealthMetricDecision,
} from '../../domain/services/health-linking-decisions.js';
import {
  validateLinkingSuggestions,
  type ValidatedOutcome,
} from '../../domain/services/health-linking-validation.js';
import type { HealthFieldUnit } from '../../domain/services/health-metric-units.js';
import { HealthFieldLinkerService } from './health-field-linker.service.js';
import {
  HealthLinkingSuggesterService,
  type LinkingField,
} from './health-linking-suggester.service.js';

const HOURLY_OPTION = 'isHourly';

export interface AutoLinkedMetric {
  metric: AppleWatchMetric;
  fieldId: string;
  fieldName: string;
  unit: HealthFieldUnit | null;
  filledDays: number;
}

export interface LinkingRunResult {
  autoLinked: AutoLinkedMetric[];
  pendingCount: number;
}

/** A field of the user as the linking needs it. */
export function toLinkingField(field: CustomField): LinkingField {
  return {
    id: field.id,
    name: field.name,
    fieldType: field.fieldType,
    isActive: field.isActive,
    isHourly: (field.optionsOrder ?? []).includes(HOURLY_OPTION),
    category: field.category ?? null,
    min: field.min ?? null,
    max: field.max ?? null,
    appleWatchMetric: field.appleWatchMetric ?? null,
  };
}

/**
 * Binds the metrics that have data but no field: links the obvious ones right away (and
 * fills their past days), and keeps the others as proposals for the user.
 */
@Injectable()
export class HealthLinkingAssistantService {
  constructor(
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly dailyMetricRepository: HealthDailyMetricRepository,
    private readonly userRepository: UserRepository,
    private readonly suggester: HealthLinkingSuggesterService,
    private readonly linker: HealthFieldLinkerService,
  ) {}

  /**
   * Runs when a metric never examined has data, when the assistant's version changed, or
   * on `force`, which examines again every metric without a decision. The metrics linked to
   * a field created by an earlier version are examined too: a field of the user that
   * matches takes the link over.
   */
  async run(userId: string, force = false): Promise<LinkingRunResult> {
    const now = new Date();
    const fields = await this.customFieldRepository.findByUserId(userId);
    const linkedMetrics = new Set(
      fields.flatMap((field) =>
        field.appleWatchMetric ? [field.appleWatchMetric] : [],
      ),
    );
    const latest = await this.dailyMetricRepository.findLatestPerMetric(userId);
    const stored = await this.userRepository.findHealthLinkingState(userId);
    const legacyMetrics = new Set(
      findLegacyLinkedFields(fields, stored).flatMap((field) =>
        field.appleWatchMetric && latest.has(field.appleWatchMetric)
          ? [field.appleWatchMetric]
          : [],
      ),
    );
    let state = reconcileLinkingState(
      stored,
      linkedMetrics,
      now,
      legacyMetrics,
    );
    const awaiting = metricsAwaitingDecision(
      [...latest.keys()],
      linkedMetrics,
      state,
    );

    const outdated = isLinkingStateOutdated(state);
    const examineAwaiting =
      awaiting.length > 0 && (force || shouldRunAssistant(awaiting, state));
    const examineLegacy =
      legacyMetrics.size > 0 && (force || outdated || examineAwaiting);
    if (!examineAwaiting && !examineLegacy) {
      if (outdated) state = { ...state, version: LINKING_STATE_VERSION };
      if (JSON.stringify(state) !== JSON.stringify(stored)) {
        await this.userRepository.saveHealthLinkingState(userId, state);
      }
      return { autoLinked: [], pendingCount: countPendingDecisions(state) };
    }

    const toExamine = [
      ...(examineAwaiting ? awaiting : []),
      ...(examineLegacy ? legacyMetrics : []),
    ];
    const user = await this.userRepository.findUserById(userId);
    const numberFields = fields
      .filter((field) => field.isActive && field.fieldType === FieldType.NUMBER)
      .map(toLinkingField);
    const { suggestions } = await this.suggester.suggest(
      user,
      toExamine.map((metric) => ({
        metric,
        exampleValue: latest.get(metric)?.value ?? 0,
      })),
      numberFields,
    );
    const validated = validateLinkingSuggestions(
      toExamine,
      suggestions,
      numberFields,
    );

    const autoLinked: AutoLinkedMetric[] = [];
    const skipped: AppleWatchMetric[] = [];
    for (const { metric, outcome } of validated) {
      const isLegacy = legacyMetrics.has(metric);
      if (outcome.kind === 'skip') {
        if (!isLegacy) skipped.push(metric);
        continue;
      }
      // Without a better field of the user, a legacy link stays as it is
      if (isLegacy && outcome.kind !== 'link') continue;
      if (
        outcome.kind === 'link' &&
        outcome.confidence >= AUTO_LINK_CONFIDENCE
      ) {
        const { field, filledDays } = await this.linker.link(
          userId,
          outcome.fieldId,
          metric,
          outcome.unit,
        );
        autoLinked.push({
          metric,
          fieldId: field.id,
          fieldName: field.name,
          unit: outcome.unit,
          filledDays,
        });
        state = withDecision(state, metric, {
          status: 'LINKED',
          fieldId: field.id,
          unit: outcome.unit,
          confidence: outcome.confidence,
          reason: outcome.reason,
          auto: true,
          decidedAt: now.toISOString(),
        });
        continue;
      }
      state = withDecision(state, metric, pendingDecision(outcome, now));
    }
    state = {
      ...state,
      skipped: examineAwaiting ? skipped : state.skipped,
      version: LINKING_STATE_VERSION,
    };
    await this.userRepository.saveHealthLinkingState(userId, state);
    return { autoLinked, pendingCount: countPendingDecisions(state) };
  }
}

function pendingDecision(
  outcome: Exclude<ValidatedOutcome, { kind: 'skip' }>,
  now: Date,
): HealthMetricDecision {
  if (outcome.kind === 'link') {
    return {
      status: 'PENDING_LINK',
      fieldId: outcome.fieldId,
      unit: outcome.unit,
      confidence: outcome.confidence,
      reason: outcome.reason,
      decidedAt: now.toISOString(),
    };
  }
  return {
    status: 'PENDING_NEW',
    suggestedName: outcome.suggestedName,
    relevance: outcome.relevance,
    reason: outcome.reason,
    decidedAt: now.toISOString(),
  };
}
