import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { FieldType } from '../enums/field-type.enum.js';
import {
  HEALTH_METRIC_CATALOG,
  type HealthMetricRelevance,
} from './health-metric-catalog.js';
import {
  inferFieldUnit,
  isUnitCompatible,
  type HealthFieldUnit,
} from './health-metric-units.js';
import type {
  LinkingSuggestion,
  LinkingSuggestions,
} from './health-linking-schema.js';

/** What the validation needs to know about a field of the user. */
export interface LinkingCandidateField {
  id: string;
  name: string;
  fieldType: FieldType;
  isActive: boolean;
  isHourly: boolean;
  max?: number | null;
  appleWatchMetric?: AppleWatchMetric | null;
}

/** Why a suggested link was turned down. */
export type LinkRejection =
  | 'unknown_field'
  | 'inactive_field'
  | 'not_number'
  | 'already_linked'
  | 'incompatible_unit'
  | 'field_taken';

export type ValidatedOutcome =
  | {
      kind: 'link';
      fieldId: string;
      unit: HealthFieldUnit | null;
      confidence: number;
      reason: string;
    }
  | {
      kind: 'propose_new';
      suggestedName: string;
      relevance: HealthMetricRelevance;
      reason: string;
    }
  | { kind: 'skip' };

export interface ValidatedLinking {
  metric: AppleWatchMetric;
  outcome: ValidatedOutcome;
  /** Set when a suggested link was rejected and replaced by a proposal of a new field. */
  rejection?: LinkRejection;
}

const MAX_SUGGESTED_NAME_LENGTH = 100;
const MAX_REASON_LENGTH = 300;

function cleanText(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function proposeNew(
  metric: AppleWatchMetric,
  suggestedName = '',
  relevance?: HealthMetricRelevance,
  reason = '',
): ValidatedOutcome {
  const definition = HEALTH_METRIC_CATALOG[metric];
  return {
    kind: 'propose_new',
    suggestedName:
      cleanText(suggestedName, MAX_SUGGESTED_NAME_LENGTH) || definition.name,
    relevance: relevance ?? definition.relevance,
    reason: cleanText(reason, MAX_REASON_LENGTH),
  };
}

type LinkSuggestion = Extract<LinkingSuggestion, { action: 'link' }>;

function checkLink(
  metric: AppleWatchMetric,
  suggestion: LinkSuggestion,
  fields: Map<string, LinkingCandidateField>,
  takenFieldIds: ReadonlySet<string>,
):
  | { ok: true; unit: HealthFieldUnit | null }
  | { ok: false; rejection: LinkRejection } {
  const field = fields.get(suggestion.fieldId);
  if (!field) return { ok: false, rejection: 'unknown_field' };
  if (!field.isActive) return { ok: false, rejection: 'inactive_field' };
  if (field.fieldType !== FieldType.NUMBER) {
    return { ok: false, rejection: 'not_number' };
  }
  if (field.appleWatchMetric && field.appleWatchMetric !== metric) {
    return { ok: false, rejection: 'already_linked' };
  }
  const inference = inferFieldUnit(metric, field);
  if (!inference.compatible) {
    return { ok: false, rejection: 'incompatible_unit' };
  }
  if (takenFieldIds.has(field.id)) {
    return { ok: false, rejection: 'field_taken' };
  }
  // The field's own hint wins; otherwise the assistant's unit, if it suits the metric
  const suggestedUnit =
    suggestion.unit !== null &&
    isUnitCompatible(metric, suggestion.unit, field.isHourly)
      ? suggestion.unit
      : null;
  const unit = inference.fromField
    ? inference.unit
    : (suggestedUnit ?? inference.unit);
  return { ok: true, unit };
}

/**
 * Checks every suggestion against the user's fields: the field exists, is active, is a
 * number, is not linked to another metric, suits the metric (clock time or duration) and is
 * claimed by a single metric (the most confident link wins). A rejected link becomes a
 * proposal of a new field; a metric the reply left out is proposed as a new field too.
 */
export function validateLinkingSuggestions(
  metrics: AppleWatchMetric[],
  suggestions: LinkingSuggestions,
  candidateFields: LinkingCandidateField[],
): ValidatedLinking[] {
  const fields = new Map(candidateFields.map((field) => [field.id, field]));
  const byMetric = new Map<AppleWatchMetric, ValidatedLinking>();
  const takenFieldIds = new Set<string>();

  const links = metrics
    .map((metric) => ({ metric, suggestion: suggestions.get(metric) }))
    .filter(
      (
        entry,
      ): entry is { metric: AppleWatchMetric; suggestion: LinkSuggestion } =>
        entry.suggestion?.action === 'link',
    )
    .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence);
  for (const { metric, suggestion } of links) {
    const check = checkLink(metric, suggestion, fields, takenFieldIds);
    if (check.ok) {
      takenFieldIds.add(suggestion.fieldId);
      byMetric.set(metric, {
        metric,
        outcome: {
          kind: 'link',
          fieldId: suggestion.fieldId,
          unit: check.unit,
          confidence: suggestion.confidence,
          reason: cleanText(suggestion.reason, MAX_REASON_LENGTH),
        },
      });
    } else {
      byMetric.set(metric, {
        metric,
        outcome: proposeNew(metric),
        rejection: check.rejection,
      });
    }
  }

  return metrics.map((metric) => {
    const validated = byMetric.get(metric);
    if (validated) return validated;
    const suggestion = suggestions.get(metric);
    if (suggestion?.action === 'skip')
      return { metric, outcome: { kind: 'skip' } };
    if (suggestion?.action === 'propose_new') {
      return {
        metric,
        outcome: proposeNew(
          metric,
          suggestion.suggestedName,
          suggestion.relevance,
          suggestion.reason,
        ),
      };
    }
    return { metric, outcome: proposeNew(metric) };
  });
}
