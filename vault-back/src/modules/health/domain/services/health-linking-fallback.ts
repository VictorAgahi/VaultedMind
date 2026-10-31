import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { FieldType } from '../enums/field-type.enum.js';
import { HEALTH_METRIC_CATALOG } from './health-metric-catalog.js';
import { matchMetricsToFields } from './health-field-matching.js';
import { inferFieldUnit } from './health-metric-units.js';
import type { LinkingSuggestions } from './health-linking-schema.js';
import type { LinkingCandidateField } from './health-linking-validation.js';

/** Confidence of a name match by number of typos: an exact alias is certain. */
const CONFIDENCE_BY_DISTANCE = [1, 0.9, 0.8];
/** Several fields are as close: proposed to the user, never applied alone. */
const AMBIGUOUS_CONFIDENCE = 0.5;

/**
 * Suggestions without any AI: a field whose name is an alias of the metric, give or take a
 * couple of typos, is linked; every other metric is proposed as a new field with the
 * catalog's name and relevance.
 */
export function buildFallbackSuggestions(
  metrics: AppleWatchMetric[],
  fields: LinkingCandidateField[],
): LinkingSuggestions {
  const linkable = fields.filter(
    (field) =>
      field.isActive &&
      field.fieldType === FieldType.NUMBER &&
      !field.appleWatchMetric,
  );
  const matches = new Map(
    matchMetricsToFields(metrics, linkable).map((match) => [
      match.metric,
      match,
    ]),
  );

  const suggestions: LinkingSuggestions = new Map();
  for (const metric of metrics) {
    const match = matches.get(metric);
    const inference = match ? inferFieldUnit(metric, match.field) : null;
    if (match && inference?.compatible) {
      suggestions.set(metric, {
        action: 'link',
        fieldId: match.field.id,
        unit: inference.unit,
        confidence: match.ambiguous
          ? AMBIGUOUS_CONFIDENCE
          : (CONFIDENCE_BY_DISTANCE[match.distance] ?? AMBIGUOUS_CONFIDENCE),
        reason: match.distance === 0 ? 'Nom identique' : 'Nom très proche',
      });
      continue;
    }
    const definition = HEALTH_METRIC_CATALOG[metric];
    suggestions.set(metric, {
      action: 'propose_new',
      suggestedName: definition.name,
      relevance: definition.relevance,
      reason: '',
    });
  }
  return suggestions;
}
