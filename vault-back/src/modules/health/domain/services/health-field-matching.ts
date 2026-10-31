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

/** Shortest names compared with a tolerance: below, a typo is as likely as another word. */
export const MIN_TYPO_TOLERANT_LENGTH = 6;
export const MAX_TYPO_DISTANCE = 2;

/**
 * Edit distance counting insertions, deletions, substitutions and swaps of two adjacent
 * letters (optimal string alignment variant of Damerau-Levenshtein).
 */
export function damerauLevenshteinDistance(
  left: string,
  right: string,
): number {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const distances: number[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0,
    ),
  );
  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      let best = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + cost,
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        best = Math.min(best, distances[row - 2][column - 2] + 1);
      }
      distances[row][column] = best;
    }
  }
  return distances[rows - 1][columns - 1];
}

/**
 * Distance between a field name and the closest alias of a metric, or null when the name is
 * not close enough: exact for short names, at most MAX_TYPO_DISTANCE edits otherwise.
 */
export function aliasDistance(
  metric: AppleWatchMetric,
  fieldName: string,
): number | null {
  const name = normalizeFieldName(fieldName);
  let best: number | null = null;
  for (const alias of METRIC_FIELD_ALIASES[metric]) {
    if (alias === name) return 0;
    if (
      name.length < MIN_TYPO_TOLERANT_LENGTH ||
      alias.length < MIN_TYPO_TOLERANT_LENGTH
    ) {
      continue;
    }
    const distance = damerauLevenshteinDistance(name, alias);
    if (distance <= MAX_TYPO_DISTANCE && (best === null || distance < best)) {
      best = distance;
    }
  }
  return best;
}

export interface TolerantMatch<T extends LinkableField> {
  metric: AppleWatchMetric;
  field: T;
  distance: number;
  /** Another field is as close to the metric: the choice is left to the user. */
  ambiguous: boolean;
}

/**
 * The closest suitable field of each metric, tolerating small typos. A field goes to the
 * metric it is closest to, and a field as close to two metrics goes to none of them.
 */
export function matchMetricsToFields<T extends LinkableField>(
  metrics: AppleWatchMetric[],
  fields: T[],
): TolerantMatch<T>[] {
  const distances = new Map<string, Map<AppleWatchMetric, number>>();
  for (const field of fields) {
    const byMetric = new Map<AppleWatchMetric, number>();
    for (const metric of metrics) {
      if (field.isHourly !== HEALTH_METRIC_CATALOG[metric].isClockTime) {
        continue;
      }
      const distance = aliasDistance(metric, field.name);
      if (distance !== null) byMetric.set(metric, distance);
    }
    distances.set(field.id, byMetric);
  }

  const ownMetricOf = (field: T): AppleWatchMetric | null => {
    const byMetric = [...(distances.get(field.id)?.entries() ?? [])];
    if (byMetric.length === 0) return null;
    const closest = Math.min(...byMetric.map(([, distance]) => distance));
    const closestMetrics = byMetric.filter(([, d]) => d === closest);
    return closestMetrics.length === 1 ? closestMetrics[0][0] : null;
  };

  const matches: TolerantMatch<T>[] = [];
  for (const metric of metrics) {
    const candidates = fields
      .filter((field) => ownMetricOf(field) === metric)
      .map((field) => ({
        field,
        distance: distances.get(field.id)?.get(metric) ?? MAX_TYPO_DISTANCE,
      }))
      .sort((a, b) => a.distance - b.distance);
    if (candidates.length === 0) continue;
    const [closest] = candidates;
    matches.push({
      metric,
      field: closest.field,
      distance: closest.distance,
      ambiguous:
        candidates.filter((c) => c.distance === closest.distance).length > 1,
    });
  }
  return matches;
}
