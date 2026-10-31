import {
  isSelfSubject,
  type TrackedSubject,
} from '../../signals/domain/tracked-subject.js';
import { AppleWatchMetric } from '../../health/domain/enums/apple-watch-metric.enum.js';
import { HEALTH_METRIC_CATALOG } from '../../health/domain/services/health-metric-catalog.js';
import type { HealthFieldUnit } from '../../health/domain/services/health-metric-units.js';
import type { ColumnCategory, PatternEffect } from './pattern-types.js';

/** Where the predictor of a finding comes from, told to the user so a link is never anonymous. */
export type PatternSource =
  | 'field'
  | 'health'
  | 'notes'
  | 'language'
  | 'logging';

export const WORD_COUNT_KEY = 'word_count';
export const ABSOLUTIST_RATIO_KEY = 'absolutist_ratio';
export const FIRST_PERSON_RATIO_KEY = 'first_person_ratio';

const SOURCE_BY_CATEGORY: Record<ColumnCategory, PatternSource> = {
  field: 'field',
  body: 'health',
  event: 'notes',
  theme: 'notes',
  state: 'notes',
  person: 'notes',
  custom: 'notes',
  language: 'language',
  logging: 'logging',
};

export function sourceOfCategory(category: ColumnCategory): PatternSource {
  return SOURCE_BY_CATEGORY[category] ?? 'notes';
}

/** Whether the predictor was read by the AI in the notes (event, theme, state, person, custom). */
export function isNotesCategory(category: ColumnCategory): boolean {
  return sourceOfCategory(category) === 'notes';
}

const LANGUAGE_LABELS: Record<string, string> = {
  [ABSOLUTIST_RATIO_KEY]: 'Mots absolus (toujours, jamais, rien...)',
  [FIRST_PERSON_RATIO_KEY]: 'Usage de « je »',
};

/** Human label of a local language marker; the length speaks of the note of the user or of the subject. */
export function languageMarkerLabel(
  key: string,
  subject?: TrackedSubject,
): string | null {
  if (key === WORD_COUNT_KEY) {
    return !subject || isSelfSubject(subject)
      ? 'Longueur de ta note'
      : 'Longueur de la note';
  }
  return LANGUAGE_LABELS[key] ?? null;
}

/** Label shown to the user: language markers are relabelled at read time, even in stored reports. */
export function readableLabel(
  key: string,
  label: string,
  subject?: TrackedSubject,
): string {
  return languageMarkerLabel(key, subject) ?? label;
}

/** Apple Health metrics measured for day D that describe the night before day D. */
const NIGHT_METRICS: ReadonlySet<AppleWatchMetric> = new Set([
  AppleWatchMetric.SLEEP,
  AppleWatchMetric.SLEEP_DEEP,
  AppleWatchMetric.SLEEP_REM,
  AppleWatchMetric.SLEEP_CORE,
  AppleWatchMetric.SLEEP_AWAKE,
  AppleWatchMetric.BEDTIME,
]);

export function isNightMetric(metric: AppleWatchMetric | undefined): boolean {
  return metric !== undefined && NIGHT_METRICS.has(metric);
}

/** How a target is measured, to tell a difference in its own unit. */
export interface TargetUnit {
  label: string;
  /** The difference is stored in this many display units per stored unit (hours to minutes: 60). */
  factor?: number;
  /** A time of day: the difference is told as earlier or later. */
  clock?: boolean;
}

export interface LinkedFieldMeasure {
  metric: AppleWatchMetric;
  /** Unit the field stores a duration in; undefined keeps the metric's own unit. */
  unit?: HealthFieldUnit | null;
}

/** Unit of the values of a field linked to Apple Health; undefined for a field of the user. */
export function unitOfLinkedField(
  measure: LinkedFieldMeasure | undefined,
): TargetUnit | undefined {
  if (!measure) return undefined;
  const definition = HEALTH_METRIC_CATALOG[measure.metric];
  if (!definition) return undefined;
  if (definition.isClockTime) return { label: 'min', factor: 60, clock: true };
  if (definition.durationUnit) {
    const stored = measure.unit ?? definition.durationUnit;
    return { label: stored === 'hours' ? 'h' : 'min' };
  }
  return definition.unitLabel ? { label: definition.unitLabel } : undefined;
}

/** Wording of a theme after "parle", with its preposition (the label alone is too terse). */
const THEME_TOPICS: Record<string, string> = {
  work_studies: 'du travail ou des études',
  romance: 'du couple ou de la vie amoureuse',
  family: 'de la famille',
  friends: 'des amis et de la vie sociale',
  physical_health: 'de la santé physique',
  money: "de l'argent",
  future: "de l'avenir ou de l'incertitude",
};

const OWN_THEME_TOPICS: Record<string, string> = {
  family: 'de ta famille',
  friends: 'de tes amis',
};

export function themeTopic(
  key: string,
  label: string,
  self: boolean = true,
): string {
  const own = self ? OWN_THEME_TOPICS[key] : undefined;
  return own ?? THEME_TOPICS[key] ?? `de « ${label} »`;
}

const ACTIONABLE_HEALTH_METRICS: ReadonlySet<AppleWatchMetric> = new Set([
  AppleWatchMetric.STEPS,
  AppleWatchMetric.ACTIVE_CALORIES,
  AppleWatchMetric.EXERCISE_MINUTES,
  AppleWatchMetric.DAYLIGHT_MINUTES,
  AppleWatchMetric.WATER_CONSUMPTION,
  AppleWatchMetric.MINDFULNESS_MINUTES,
  AppleWatchMetric.SLEEP,
  AppleWatchMetric.BEDTIME,
]);

export interface ActionabilityInput {
  category: ColumnCategory;
  /** Apple Health metric behind the predictor, when it is a linked field. */
  predictorMetric?: AppleWatchMetric;
  /** Apple Health metric behind the target, when it is a linked field. */
  targetMetric?: AppleWatchMetric;
}

/**
 * Whether a predictor is something the person can act on (a lever) rather than a companion
 * that merely varies at the same time: states, themes, language, logging, body readings
 * (heart rate, variability...) and the other nights next to a night target are companions.
 */
export function isActionablePredictor(input: ActionabilityInput): boolean {
  switch (input.category) {
    case 'field':
    case 'event':
    case 'person':
    case 'custom':
      return true;
    case 'body': {
      const { predictorMetric, targetMetric } = input;
      if (predictorMetric === undefined) return true;
      if (isNightMetric(predictorMetric) && isNightMetric(targetMetric)) {
        return false;
      }
      return ACTIONABLE_HEALTH_METRICS.has(predictorMetric);
    }
    default:
      return false;
  }
}

export const MIN_EFFECT_IN_SD = 0.25;
export const MIN_BINARY_EFFECT = 0.05;

/**
 * An effect too small to be worth telling: under a quarter of the standard deviation of the
 * target, or under 5 points of frequency for a yes/no target. Without the deviation
 * (reports computed before it was stored) nothing is hidden.
 */
export function isNegligibleEffect(
  effect: PatternEffect | null,
  targetSd: number | undefined,
  targetBinary: boolean,
): boolean {
  if (!effect) return false;
  const size = Math.abs(effect.difference);
  if (targetBinary || effect.targetBinary) return size < MIN_BINARY_EFFECT;
  if (targetSd === undefined || !(targetSd > 0)) return false;
  return size < MIN_EFFECT_IN_SD * targetSd;
}

/** Unit and metric of the fields linked to Apple Health, by field id. */
export function linkedFieldMeasures(
  fields: ReadonlyArray<{
    id: string;
    appleWatchMetric?: AppleWatchMetric | null;
    appleWatchUnit?: HealthFieldUnit | null;
  }>,
): Map<string, LinkedFieldMeasure> {
  return new Map(
    fields.flatMap((field) =>
      field.appleWatchMetric
        ? [
            [
              field.id,
              { metric: field.appleWatchMetric, unit: field.appleWatchUnit },
            ] as [string, LinkedFieldMeasure],
          ]
        : [],
    ),
  );
}
