import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';

export const APPLE_HEALTH_CATEGORY = 'Apple Santé';

export interface HealthMetricDefinition {
  name: string;
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
    min: 0,
    max: 24,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.STEPS]: {
    name: 'Pas',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.ACTIVE_CALORIES]: {
    name: 'Calories actives',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.RESTING_HEART_RATE]: {
    name: 'Fréquence cardiaque au repos',
    min: 0,
    max: 250,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.WATER_CONSUMPTION]: {
    name: 'Eau',
    min: 0,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.MINDFULNESS_MINUTES]: {
    name: 'Pleine conscience',
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.HEART_RATE_VARIABILITY]: {
    name: 'Variabilité cardiaque',
    min: 0,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.EXERCISE_MINUTES]: {
    name: "Minutes d'exercice",
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.DAYLIGHT_MINUTES]: {
    name: 'Lumière du jour',
    min: 0,
    max: 1440,
    isClockTime: false,
    decimals: 1,
  },
  [AppleWatchMetric.RESPIRATORY_RATE]: {
    name: 'Fréquence respiratoire',
    min: 0,
    max: 100,
    isClockTime: false,
    decimals: 1,
    zeroMeansNoData: true,
  },
  [AppleWatchMetric.BEDTIME]: {
    name: 'Heure du coucher',
    min: 0,
    max: 24,
    isClockTime: true,
    decimals: 2,
  },
};

export function roundHealthValue(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
