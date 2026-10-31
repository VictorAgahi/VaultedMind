import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import type { HealthMetricRelevance } from './health-metric-catalog.js';
import {
  HEALTH_FIELD_UNITS,
  type HealthFieldUnit,
} from './health-metric-units.js';

/** What the assistant suggests for one metric, before any validation. */
export type LinkingSuggestion =
  | {
      action: 'link';
      fieldId: string;
      unit: HealthFieldUnit | null;
      confidence: number;
      reason: string;
    }
  | {
      action: 'propose_new';
      suggestedName: string;
      relevance: HealthMetricRelevance;
      reason: string;
    }
  | { action: 'skip'; reason: string };

export type LinkingSuggestions = Map<AppleWatchMetric, LinkingSuggestion>;

const RELEVANCES: HealthMetricRelevance[] = ['high', 'low'];
const REASON_DESCRIPTION = 'Raison courte, en français';

interface StringProperty {
  type: 'string';
  description?: string;
  enum?: string[];
}

interface NullableEnumProperty {
  type: ['string', 'null'];
  enum: Array<string | null>;
}

interface VariantSchema {
  type: 'object';
  properties: Record<
    string,
    | StringProperty
    | NullableEnumProperty
    | { type: 'number'; description: string }
  >;
  required: string[];
  additionalProperties: false;
}

export interface HealthLinkingJsonSchema {
  type: 'object';
  properties: Record<string, { anyOf: VariantSchema[] }>;
  required: string[];
  additionalProperties: false;
}

function variant(properties: VariantSchema['properties']): VariantSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/**
 * Strict schema of the reply: one entry per metric, either a link to one of the given
 * fields, a new field to propose or nothing. Without fields, linking is not offered.
 */
export function buildHealthLinkingSchema(
  metrics: AppleWatchMetric[],
  fieldIds: string[],
): HealthLinkingJsonSchema {
  const variants: VariantSchema[] = [];
  if (fieldIds.length > 0) {
    variants.push(
      variant({
        action: { type: 'string', enum: ['link'] },
        fieldId: { type: 'string', enum: fieldIds },
        unit: { type: ['string', 'null'], enum: [...HEALTH_FIELD_UNITS, null] },
        confidence: {
          type: 'number',
          description: 'Confiance entre 0 et 1',
        },
        reason: { type: 'string', description: REASON_DESCRIPTION },
      }),
    );
  }
  variants.push(
    variant({
      action: { type: 'string', enum: ['propose_new'] },
      suggestedName: {
        type: 'string',
        description: 'Nom du champ à créer, en français',
      },
      relevance: { type: 'string', enum: RELEVANCES },
      reason: { type: 'string', description: REASON_DESCRIPTION },
    }),
    variant({
      action: { type: 'string', enum: ['skip'] },
      reason: { type: 'string', description: REASON_DESCRIPTION },
    }),
  );
  return {
    type: 'object',
    properties: Object.fromEntries(
      metrics.map((metric) => [metric, { anyOf: variants }]),
    ),
    required: [...metrics],
    additionalProperties: false,
  };
}

interface RawEntry {
  action?: string;
  fieldId?: string;
  unit?: string | null;
  confidence?: number;
  suggestedName?: string;
  relevance?: string;
  reason?: string;
}

function isRecord(value: object | null): value is Record<string, RawEntry> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEntry(entry: RawEntry): LinkingSuggestion | null {
  const reason = typeof entry.reason === 'string' ? entry.reason : '';
  if (entry.action === 'link' && typeof entry.fieldId === 'string') {
    const unit = HEALTH_FIELD_UNITS.find((known) => known === entry.unit);
    return {
      action: 'link',
      fieldId: entry.fieldId,
      unit: unit ?? null,
      confidence:
        typeof entry.confidence === 'number' &&
        Number.isFinite(entry.confidence)
          ? Math.min(1, Math.max(0, entry.confidence))
          : 0,
      reason,
    };
  }
  if (entry.action === 'propose_new') {
    return {
      action: 'propose_new',
      suggestedName:
        typeof entry.suggestedName === 'string' ? entry.suggestedName : '',
      relevance: entry.relevance === 'high' ? 'high' : 'low',
      reason,
    };
  }
  if (entry.action === 'skip') return { action: 'skip', reason };
  return null;
}

/** Reads the reply; malformed entries and unknown metrics are left out. */
export function parseHealthLinkingReply(
  raw: string,
  metrics: AppleWatchMetric[],
): LinkingSuggestions {
  const parsed = JSON.parse(raw) as object | null;
  if (!isRecord(parsed)) {
    throw new Error('The linking reply is not an object');
  }
  const suggestions: LinkingSuggestions = new Map();
  for (const metric of metrics) {
    const entry = parsed[metric];
    if (!entry || typeof entry !== 'object') continue;
    const suggestion = parseEntry(entry);
    if (suggestion) suggestions.set(metric, suggestion);
  }
  return suggestions;
}
