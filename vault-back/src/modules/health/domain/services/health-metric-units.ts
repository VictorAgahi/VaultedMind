import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  HEALTH_METRIC_CATALOG,
  HealthDurationUnit,
  roundHealthValue,
} from './health-metric-catalog.js';
import { normalizeFieldName } from './health-field-matching.js';

/** Unit a linked field stores a duration metric in; null keeps the metric's own unit. */
export type HealthFieldUnit = HealthDurationUnit;
export const HEALTH_FIELD_UNITS: HealthFieldUnit[] = ['hours', 'minutes'];

const MINUTES_PER_HOUR = 60;
const CONVERTED_DECIMALS: Record<HealthFieldUnit, number> = {
  hours: 2,
  minutes: 0,
};

/** What the unit inference needs to know about a field. */
export interface UnitTargetField {
  name: string;
  max?: number | null;
  /** The field is a clock time stored as decimal hours (the "isHourly" option). */
  isHourly: boolean;
}

export type UnitInference =
  | { compatible: false }
  | {
      compatible: true;
      unit: HealthFieldUnit | null;
      /** The field itself tells the unit (its name or its maximum), not a default. */
      fromField: boolean;
    };

export function isDurationMetric(metric: AppleWatchMetric): boolean {
  return HEALTH_METRIC_CATALOG[metric].durationUnit !== undefined;
}

/**
 * A clock-time field only receives the bedtime, and the bedtime only a clock-time field;
 * a unit only makes sense on a duration metric.
 */
export function isUnitCompatible(
  metric: AppleWatchMetric,
  unit: HealthFieldUnit | null,
  isHourly: boolean,
): boolean {
  if (HEALTH_METRIC_CATALOG[metric].isClockTime !== isHourly) return false;
  return unit === null || isDurationMetric(metric);
}

/**
 * The unit a field expects for a metric: minutes when its name says so or its maximum is
 * above a day in hours, hours otherwise. Metrics that are not durations keep their own unit.
 */
export function inferFieldUnit(
  metric: AppleWatchMetric,
  field: UnitTargetField,
): UnitInference {
  if (!isUnitCompatible(metric, null, field.isHourly)) {
    return { compatible: false };
  }
  if (!isDurationMetric(metric)) {
    return { compatible: true, unit: null, fromField: true };
  }
  const words = normalizeFieldName(field.name).split(' ');
  if (words.some((word) => word.startsWith('min'))) {
    return { compatible: true, unit: 'minutes', fromField: true };
  }
  if (field.max !== undefined && field.max !== null) {
    return {
      compatible: true,
      unit: field.max > 24 ? 'minutes' : 'hours',
      fromField: true,
    };
  }
  return { compatible: true, unit: 'hours', fromField: false };
}

/** The value a field receives: the metric's own value converted to the field's unit, rounded. */
export function convertHealthValue(
  metric: AppleWatchMetric,
  nativeValue: number,
  unit: HealthFieldUnit | null | undefined,
): number {
  const definition = HEALTH_METRIC_CATALOG[metric];
  const nativeUnit = definition.durationUnit;
  if (!unit || !nativeUnit || unit === nativeUnit) {
    return roundHealthValue(nativeValue, definition.decimals);
  }
  const converted =
    unit === 'minutes'
      ? nativeValue * MINUTES_PER_HOUR
      : nativeValue / MINUTES_PER_HOUR;
  return roundHealthValue(converted, CONVERTED_DECIMALS[unit]);
}
