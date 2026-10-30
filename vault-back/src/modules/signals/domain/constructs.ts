import { AppleWatchMetric } from '../../health/domain/enums/apple-watch-metric.enum.js';

/**
 * What a column measures. Two columns measuring the same construct (a mood field and the mood
 * read from the note, an Apple Watch sleep metric and the "poor sleep" event) are the same
 * thing seen twice and must never be tested against each other.
 */
export const CONSTRUCTS = [
  'sleep',
  'fatigue',
  'mood',
  'anxiety',
  'stress',
  'rumination',
  'social',
  'romance',
  'family',
  'work',
  'money',
  'future',
  'physical_activity',
  'physical_health',
  'pain',
  'substances',
  'screens',
  'outdoors',
  'pleasure',
  'achievement',
  'conflict',
  'avoidance',
  'loneliness',
  'self_view',
  'control',
  'appetite',
  'mindfulness',
  'language',
  'logging',
  'other',
] as const;

export type Construct = (typeof CONSTRUCTS)[number];
export type PersonConstruct = `person:${string}`;
/** A construct of the closed list, or the construct of one person of the user's entourage. */
export type ConstructKey = Construct | PersonConstruct;

export const OTHER_CONSTRUCT: Construct = 'other';

/** Minimum Jev confidence to accept the construct of a custom field. */
export const MIN_CONSTRUCT_CONFIDENCE = 0.5;

export function isConstruct(value: string): value is Construct {
  return (CONSTRUCTS as readonly string[]).includes(value);
}

export function personConstruct(personId: string): PersonConstruct {
  return `person:${personId}`;
}

const APPLE_WATCH_CONSTRUCTS: Record<AppleWatchMetric, Construct> = {
  [AppleWatchMetric.SLEEP]: 'sleep',
  [AppleWatchMetric.STEPS]: 'physical_activity',
  [AppleWatchMetric.ACTIVE_CALORIES]: 'physical_activity',
  [AppleWatchMetric.RESTING_HEART_RATE]: 'physical_health',
  [AppleWatchMetric.MINDFULNESS_MINUTES]: 'mindfulness',
  [AppleWatchMetric.WATER_CONSUMPTION]: 'other',
};

export function constructOfAppleWatchMetric(
  metric: AppleWatchMetric,
): Construct {
  return APPLE_WATCH_CONSTRUCTS[metric];
}

export interface ConstructFieldSource {
  appleWatchMetric?: AppleWatchMetric | string | null;
  construct?: string | null;
  constructOverride?: string | null;
}

function isKnownConstruct(
  value: string | null | undefined,
): value is Construct {
  return !!value && isConstruct(value);
}

/**
 * Construct of a custom field: Apple Watch metrics are mapped directly, otherwise the user
 * override wins over the automatic classification, and anything unknown is "other".
 */
export function effectiveConstruct(field: ConstructFieldSource): Construct {
  if (field.appleWatchMetric) {
    const metric = field.appleWatchMetric as AppleWatchMetric;
    if (metric in APPLE_WATCH_CONSTRUCTS) {
      return constructOfAppleWatchMetric(metric);
    }
  }
  if (isKnownConstruct(field.constructOverride)) return field.constructOverride;
  if (isKnownConstruct(field.construct)) return field.construct;
  return OTHER_CONSTRUCT;
}

/** Two columns are duplicates of each other when they share a construct other than "other". */
export function sharesConstruct(
  left: ConstructKey,
  right: ConstructKey,
): boolean {
  return left === right && left !== OTHER_CONSTRUCT;
}
