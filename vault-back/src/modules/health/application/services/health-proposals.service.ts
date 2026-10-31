import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { HealthDailyMetricRepository } from '../../../../database/repositories/health-daily-metric.repository.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import {
  APPLE_HEALTH_CATEGORY,
  HEALTH_METRIC_CATALOG,
  roundHealthValue,
} from '../../domain/services/health-metric-catalog.js';
import {
  countPendingDecisions,
  findLegacyLinkedFields,
  isPendingDecision,
  reconcileLinkingState,
  withDecision,
  withoutDecision,
  type HealthLinkingState,
  type HealthMetricDecision,
} from '../../domain/services/health-linking-decisions.js';
import {
  validateLinkingSuggestions,
  type LinkRejection,
} from '../../domain/services/health-linking-validation.js';
import {
  isUnitCompatible,
  type HealthFieldUnit,
} from '../../domain/services/health-metric-units.js';
import type {
  AcceptHealthProposalDto,
  HealthProposalAcceptResult,
  HealthProposalView,
  HealthProposalsRunResult,
  HealthProposalsView,
} from '../dtos/health-proposals.dto.js';
import { HealthFieldLinkerService } from './health-field-linker.service.js';
import {
  HealthLinkingAssistantService,
  toLinkingField,
} from './health-linking-assistant.service.js';

const HOURLY_OPTION = 'isHourly';

const REJECTION_MESSAGES: Record<LinkRejection, string> = {
  unknown_field: "Ce champ n'existe pas.",
  inactive_field: 'Ce champ est désactivé.',
  not_number: 'Seul un champ numérique peut recevoir une donnée Santé.',
  already_linked: 'Ce champ reçoit déjà une autre donnée Santé.',
  incompatible_unit:
    "Ce champ ne convient pas : une heure d'horloge ne va que dans un champ heure, et inversement.",
  field_taken: 'Ce champ est déjà choisi pour une autre donnée.',
};

interface UserLinkingContext {
  fields: CustomField[];
  linkedMetrics: Set<AppleWatchMetric>;
  /** Metrics linked to a field created by an earlier version. */
  legacyMetrics: Set<AppleWatchMetric>;
  stored: HealthLinkingState;
  state: HealthLinkingState;
}

/** The proposals of the linking assistant, and what the user answers to them. */
@Injectable()
export class HealthProposalsService {
  constructor(
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly dailyMetricRepository: HealthDailyMetricRepository,
    private readonly userRepository: UserRepository,
    private readonly linker: HealthFieldLinkerService,
    private readonly assistant: HealthLinkingAssistantService,
  ) {}

  async list(userId: string): Promise<HealthProposalsView> {
    const { fields, linkedMetrics, legacyMetrics, stored, state } =
      await this.loadContext(userId);
    await this.saveIfChanged(userId, stored, state);
    const latest = await this.dailyMetricRepository.findLatestPerMetric(userId);
    const fieldsById = new Map(fields.map((field) => [field.id, field]));
    const linkable = new Map(
      fields.map((field) => [field.id, toLinkingField(field)]),
    );

    const proposals: HealthProposalView[] = [];
    for (const metric of Object.values(AppleWatchMetric)) {
      const decision = state.decisions[metric];
      if (!decision || !isPendingDecision(decision)) continue;
      if (linkedMetrics.has(metric) && !legacyMetrics.has(metric)) continue;
      const definition = HEALTH_METRIC_CATALOG[metric];
      const reading = latest.get(metric);
      const proposedField =
        decision.status === 'PENDING_LINK' && decision.fieldId
          ? linkable.get(decision.fieldId)
          : undefined;
      // A proposed field deleted or linked meanwhile turns the proposal into a new field
      const stillLinkable =
        proposedField !== undefined &&
        validateLinkingSuggestions(
          [metric],
          new Map([
            [
              metric,
              {
                action: 'link',
                fieldId: proposedField.id,
                unit: decision.unit ?? null,
                confidence: 1,
                reason: '',
              },
            ],
          ]),
          [proposedField],
        )[0].rejection === undefined;
      // A legacy link is only replaced by a field of the user, never by a new field
      if (legacyMetrics.has(metric) && !stillLinkable) continue;
      proposals.push({
        metric,
        label: definition.name,
        unitLabel: definition.unitLabel,
        exampleValue: reading
          ? roundHealthValue(reading.value, definition.decimals)
          : null,
        exampleDate: reading?.logDate ?? null,
        status: stillLinkable ? 'PENDING_LINK' : 'PENDING_NEW',
        relevance: decision.relevance ?? definition.relevance,
        fieldId: stillLinkable ? proposedField.id : null,
        fieldName: stillLinkable ? proposedField.name : null,
        unit: stillLinkable ? (decision.unit ?? null) : null,
        suggestedName: stillLinkable
          ? null
          : (decision.suggestedName ?? definition.name),
        confidence: decision.confidence ?? null,
        reason: decision.reason || null,
      });
    }

    const decisionEntries = Object.entries(state.decisions) as Array<
      [AppleWatchMetric, HealthMetricDecision]
    >;
    return {
      proposals,
      ignored: decisionEntries
        .filter(([, decision]) => decision.status === 'IGNORED')
        .map(([metric]) => ({
          metric,
          label: HEALTH_METRIC_CATALOG[metric].name,
        })),
      autoLinked: decisionEntries.flatMap(([metric, decision]) => {
        const field = decision.fieldId
          ? fieldsById.get(decision.fieldId)
          : undefined;
        if (!decision.auto || !field || field.appleWatchMetric !== metric) {
          return [];
        }
        return [
          {
            metric,
            label: HEALTH_METRIC_CATALOG[metric].name,
            fieldId: field.id,
            fieldName: field.name,
            decidedAt: decision.decidedAt,
          },
        ];
      }),
      legacyFields: findLegacyLinkedFields(fields, state).map((field) => ({
        id: field.id,
        name: field.name,
        metric: field.appleWatchMetric as AppleWatchMetric,
      })),
    };
  }

  async accept(
    userId: string,
    metric: AppleWatchMetric,
    dto: AcceptHealthProposalDto,
  ): Promise<HealthProposalAcceptResult> {
    const { fields, state } = await this.loadContext(userId);
    const decision = state.decisions[metric];
    const proposedFieldId =
      decision?.status === 'PENDING_LINK' ? decision.fieldId : undefined;
    const fieldId = dto.create ? undefined : (dto.fieldId ?? proposedFieldId);

    let result: HealthProposalAcceptResult;
    if (fieldId) {
      const unit = this.checkLink(metric, fieldId, dto.unit, decision, fields);
      const { field, filledDays } = await this.linker.link(
        userId,
        fieldId,
        metric,
        unit,
      );
      result = {
        metric,
        fieldId: field.id,
        fieldName: field.name,
        unit,
        created: false,
        filledDays,
      };
    } else {
      const definition = HEALTH_METRIC_CATALOG[metric];
      const created = await this.createField(
        userId,
        metric,
        dto.create?.name?.trim() || decision?.suggestedName || definition.name,
        dto.create?.category?.trim() || APPLE_HEALTH_CATEGORY,
        fields,
      );
      const unit = definition.durationUnit ?? null;
      const { field, filledDays } = await this.linker.link(
        userId,
        created.id,
        metric,
        unit,
      );
      result = {
        metric,
        fieldId: field.id,
        fieldName: field.name,
        unit,
        created: true,
        filledDays,
      };
    }

    await this.userRepository.saveHealthLinkingState(
      userId,
      withDecision(state, metric, {
        status: 'LINKED',
        fieldId: result.fieldId,
        unit: result.unit,
        auto: false,
        decidedAt: new Date().toISOString(),
      }),
    );
    return result;
  }

  async ignore(
    userId: string,
    metric: AppleWatchMetric,
  ): Promise<{ pendingCount: number }> {
    const { state } = await this.loadContext(userId);
    const next = withDecision(state, metric, {
      status: 'IGNORED',
      decidedAt: new Date().toISOString(),
    });
    await this.userRepository.saveHealthLinkingState(userId, next);
    return { pendingCount: countPendingDecisions(next) };
  }

  /** Forgets that the metric was ignored; the assistant examines it again right away. */
  async unignore(
    userId: string,
    metric: AppleWatchMetric,
  ): Promise<HealthProposalsRunResult> {
    const { state } = await this.loadContext(userId);
    if (state.decisions[metric]?.status === 'IGNORED') {
      await this.userRepository.saveHealthLinkingState(
        userId,
        withoutDecision(state, metric),
      );
    }
    return this.assistant.run(userId);
  }

  async run(userId: string): Promise<HealthProposalsRunResult> {
    return this.assistant.run(userId, true);
  }

  private async loadContext(userId: string): Promise<UserLinkingContext> {
    const fields = await this.customFieldRepository.findByUserId(userId);
    const linkedMetrics = new Set(
      fields.flatMap((field) =>
        field.appleWatchMetric ? [field.appleWatchMetric] : [],
      ),
    );
    const stored = await this.userRepository.findHealthLinkingState(userId);
    const legacyMetrics = new Set(
      findLegacyLinkedFields(fields, stored).flatMap((field) =>
        field.appleWatchMetric ? [field.appleWatchMetric] : [],
      ),
    );
    const state = reconcileLinkingState(
      stored,
      linkedMetrics,
      new Date(),
      legacyMetrics,
    );
    return { fields, linkedMetrics, legacyMetrics, stored, state };
  }

  private async saveIfChanged(
    userId: string,
    stored: HealthLinkingState,
    state: HealthLinkingState,
  ): Promise<void> {
    if (JSON.stringify(stored) !== JSON.stringify(state)) {
      await this.userRepository.saveHealthLinkingState(userId, state);
    }
  }

  /** The same checks as for the assistant's links; a unit chosen by the user wins if it suits. */
  private checkLink(
    metric: AppleWatchMetric,
    fieldId: string,
    requestedUnit: HealthFieldUnit | undefined,
    decision: HealthMetricDecision | undefined,
    fields: CustomField[],
  ): HealthFieldUnit | null {
    const candidates = fields.map(toLinkingField);
    const [validated] = validateLinkingSuggestions(
      [metric],
      new Map([
        [
          metric,
          {
            action: 'link',
            fieldId,
            unit:
              decision?.fieldId === fieldId ? (decision.unit ?? null) : null,
            confidence: 1,
            reason: '',
          },
        ],
      ]),
      candidates,
    );
    if (validated.rejection || validated.outcome.kind !== 'link') {
      throw new BadRequestException(
        REJECTION_MESSAGES[validated.rejection ?? 'unknown_field'],
      );
    }
    if (requestedUnit === undefined) return validated.outcome.unit;
    const field = candidates.find((candidate) => candidate.id === fieldId);
    if (!field || !isUnitCompatible(metric, requestedUnit, field.isHourly)) {
      throw new BadRequestException(
        'Cette unité ne convient pas à cette donnée Santé.',
      );
    }
    return requestedUnit;
  }

  private async createField(
    userId: string,
    metric: AppleWatchMetric,
    name: string,
    category: string,
    existing: CustomField[],
  ): Promise<CustomField> {
    const definition = HEALTH_METRIC_CATALOG[metric];
    const taken = existing.some((field) => field.name === name);
    const now = new Date();
    return this.customFieldRepository.saveDomain(
      new CustomField(
        uuidv4(),
        userId,
        taken ? `${name} (Santé)` : name,
        FieldType.NUMBER,
        true,
        now,
        now,
        definition.isClockTime ? [HOURLY_OPTION] : undefined,
        category,
        false,
        definition.min,
        definition.max,
      ),
    );
  }
}
