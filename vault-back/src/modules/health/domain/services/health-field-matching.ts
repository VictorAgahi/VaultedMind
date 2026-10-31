import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { HEALTH_METRIC_CATALOG } from './health-metric-catalog.js';

/** What the matching needs to know about a field of the user. */
export interface LinkableField {
  id: string;
  name: string;
  /** The field is a clock time stored as decimal hours (the "isHourly" option). */
  isHourly: boolean;
}

/** Names (already normalized) under which users usually call each metric. */
export const METRIC_FIELD_ALIASES: Record<AppleWatchMetric, string[]> = {
  [AppleWatchMetric.SLEEP]: [
    'sommeil',
    'temps de sommeil',
    'heures de sommeil',
    'duree de sommeil',
    'sleep',
  ],
  [AppleWatchMetric.STEPS]: ['pas', 'nombre de pas', 'steps'],
  [AppleWatchMetric.ACTIVE_CALORIES]: [
    'calories actives',
    'calories brulees',
    'active calories',
  ],
  [AppleWatchMetric.RESTING_HEART_RATE]: [
    'frequence cardiaque au repos',
    'fc repos',
    'rythme cardiaque au repos',
    'resting heart rate',
  ],
  [AppleWatchMetric.WATER_CONSUMPTION]: ['eau', 'water'],
  [AppleWatchMetric.MINDFULNESS_MINUTES]: [
    'pleine conscience',
    'minutes de pleine conscience',
    'mindfulness',
  ],
  [AppleWatchMetric.HEART_RATE_VARIABILITY]: [
    'hrv',
    'variabilite cardiaque',
    'variabilite de la frequence cardiaque',
  ],
  [AppleWatchMetric.EXERCISE_MINUTES]: [
    'minutes d exercice',
    'temps d exercice',
    'exercice',
  ],
  [AppleWatchMetric.DAYLIGHT_MINUTES]: [
    'lumiere du jour',
    'temps a la lumiere du jour',
    'daylight',
  ],
  [AppleWatchMetric.RESPIRATORY_RATE]: [
    'frequence respiratoire',
    'respiratory rate',
  ],
  [AppleWatchMetric.BEDTIME]: ['heure du coucher', 'coucher', 'bedtime'],
  [AppleWatchMetric.SLEEP_DEEP]: [
    'sommeil profond',
    'temps de sommeil profond',
    'deep sleep',
  ],
  [AppleWatchMetric.SLEEP_REM]: [
    'sommeil paradoxal',
    'temps de sommeil paradoxal',
    'sommeil rem',
    'rem sleep',
    'rem',
  ],
  [AppleWatchMetric.SLEEP_CORE]: [
    'sommeil leger',
    'temps de sommeil leger',
    'sommeil essentiel',
    'core sleep',
  ],
  [AppleWatchMetric.SLEEP_AWAKE]: [
    'temps eveille',
    'temps eveille la nuit',
    'reveils',
    'awake time',
  ],
};

/** Lowercase, no accents, punctuation turned into spaces, spaces collapsed. */
export function normalizeFieldName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Fields whose name is an alias of the metric. A clock-time field only suits a clock-time
 * metric and a duration or count metric never suits a clock-time field: the stored value
 * would be read in the wrong unit.
 */
export function findFieldsMatchingMetric<T extends LinkableField>(
  metric: AppleWatchMetric,
  fields: T[],
): T[] {
  const aliases = new Set(METRIC_FIELD_ALIASES[metric]);
  const wantsClockTime = HEALTH_METRIC_CATALOG[metric].isClockTime;
  return fields.filter(
    (field) =>
      field.isHourly === wantsClockTime &&
      aliases.has(normalizeFieldName(field.name)),
  );
}
