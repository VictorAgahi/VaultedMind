import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';

export const APPLE_HEALTH_CATEGORY = 'Apple Santé';

/** Whether a metric is usually worth tracking next to mood and behaviour. */
export type HealthMetricRelevance = 'high' | 'low';

/** Unit a duration metric is computed in by the sync. */
export type HealthDurationUnit = 'hours' | 'minutes';

export interface HealthMetricDefinition {
  name: string;
  /** Short French unit shown next to a value ("" when none). */
  unitLabel: string;
  relevance: HealthMetricRelevance;
  /** Set on duration metrics, which a field may store in hours or in minutes. */
  durationUnit?: HealthDurationUnit;
  min?: number;
  max?: number;
  /** The value is a time of day stored as decimal hours, like the other hourly fields. */
  isClockTime: boolean;
  decimals: number;
  /** An average over no reading comes out as 0: a non-positive value means no data. */
  zeroMeansNoData?: boolean;
}

export const HEALTH_METRIC_CATALOG: Record<
  AppleWatchMetric,
  HealthMetricDefinition
> = {
  [AppleWatchMetric.SLEEP]: {
    name: 'Sommeil',
    unitLabel: 'h',
    relevance: 'high',
    durationUnit: 'hours',
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.STEPS]: {
    name: 'Pas',
    unitLabel: 'pas',
    relevance: 'high',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.ACTIVE_CALORIES]: {
    name: 'Calories actives',
    unitLabel: 'kcal',
    relevance: 'low',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.RESTING_HEART_RATE]: {
    name: 'Fréquence cardiaque au repos',
    unitLabel: 'bpm',
    relevance: 'high',
    min: 0,
    max: 250,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.WATER_CONSUMPTION]: {
    name: 'Eau',
    unitLabel: '',
    relevance: 'low',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.MINDFULNESS_MINUTES]: {
    name: 'Pleine conscience',
    unitLabel: 'min',
    relevance: 'low',
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.HEART_RATE_VARIABILITY]: {
    name: 'Variabilité cardiaque',
    unitLabel: 'ms',
    relevance: 'high',
    min: 0,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.EXERCISE_MINUTES]: {
    name: "Minutes d'exercice",
    unitLabel: 'min',
    relevance: 'high',
    durationUnit: 'minutes',
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.DAYLIGHT_MINUTES]: {
    name: 'Lumière du jour',
    unitLabel: 'min',
    relevance: 'low',
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.RESPIRATORY_RATE]: {
    name: 'Fréquence respiratoire',
    unitLabel: 'resp./min',
    relevance: 'low',
    min: 0,
    max: 100,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.BEDTIME]: {
    name: 'Heure du coucher',
    unitLabel: '',
    relevance: 'high',
    min: 0,
    max: 24,
    isClockTime: true,
    decimals: 2,
  },
  [AppleWatchMetric.SLEEP_DEEP]: {
    name: 'Sommeil profond',
    unitLabel: 'h',
    relevance: 'high',
    durationUnit: 'hours',
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 2,
  },
  [AppleWatchMetric.SLEEP_REM]: {
    name: 'Sommeil paradoxal',
    unitLabel: 'h',
    relevance: 'high',
    durationUnit: 'hours',
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 2,
  },
  [AppleWatchMetric.SLEEP_CORE]: {
    name: 'Sommeil léger',
    unitLabel: 'h',
    relevance: 'high',
    durationUnit: 'hours',
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 2,
  },
  [AppleWatchMetric.SLEEP_AWAKE]: {
    name: 'Temps éveillé la nuit',
    unitLabel: 'h',
    relevance: 'high',
    durationUnit: 'hours',
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 2,
  },
};

export function roundHealthValue(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
