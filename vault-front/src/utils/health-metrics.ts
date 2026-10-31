import { AppleWatchMetric, CustomField, FieldType, HealthFieldUnit } from "@/types";

export interface HealthMetricInfo {
  metric: AppleWatchMetric;
  /** Nom affiché quand le champ est créé automatiquement. */
  label: string;
  /** Unité courte accolée à la valeur ("" : aucune). */
  unit: string;
  /** Indication d'unité affichée dans les réglages. */
  unitHint: string;
}

const HOURLY_OPTION = "isHourly";

/** Seule l'heure du coucher est une heure d'horloge : les autres données sont des durées ou des quantités. */
export const isClockTimeMetric = (metric: AppleWatchMetric): boolean => metric === AppleWatchMetric.BEDTIME;

/** Un champ « heure » ne reçoit qu'une heure d'horloge, et inversement : sinon la valeur serait lue dans la mauvaise unité. */
export const fieldSuitsMetric = (field: CustomField, metric: AppleWatchMetric): boolean =>
  field.fieldType === FieldType.NUMBER &&
  field.isActive &&
  (field.optionsOrder ?? []).includes(HOURLY_OPTION) === isClockTimeMetric(metric);

export const HEALTH_METRICS: HealthMetricInfo[] = [
  { metric: AppleWatchMetric.SLEEP, label: "Sommeil", unit: "h", unitHint: "heures" },
  { metric: AppleWatchMetric.SLEEP_DEEP, label: "Sommeil profond", unit: "h", unitHint: "heures" },
  { metric: AppleWatchMetric.SLEEP_REM, label: "Sommeil paradoxal", unit: "h", unitHint: "heures" },
  { metric: AppleWatchMetric.SLEEP_CORE, label: "Sommeil léger", unit: "h", unitHint: "heures" },
  { metric: AppleWatchMetric.SLEEP_AWAKE, label: "Temps éveillé la nuit", unit: "h", unitHint: "heures" },
  { metric: AppleWatchMetric.BEDTIME, label: "Heure du coucher", unit: "", unitHint: "heure de coucher" },
  { metric: AppleWatchMetric.STEPS, label: "Pas", unit: "", unitHint: "pas" },
  { metric: AppleWatchMetric.ACTIVE_CALORIES, label: "Calories actives", unit: "kcal", unitHint: "kcal" },
  { metric: AppleWatchMetric.EXERCISE_MINUTES, label: "Minutes d'exercice", unit: "min", unitHint: "minutes" },
  { metric: AppleWatchMetric.RESTING_HEART_RATE, label: "Fréquence cardiaque au repos", unit: "bpm", unitHint: "bpm" },
  { metric: AppleWatchMetric.HEART_RATE_VARIABILITY, label: "Variabilité cardiaque", unit: "ms", unitHint: "ms" },
  { metric: AppleWatchMetric.RESPIRATORY_RATE, label: "Fréquence respiratoire", unit: "resp./min", unitHint: "respirations/min" },
  { metric: AppleWatchMetric.MINDFULNESS_MINUTES, label: "Pleine conscience", unit: "min", unitHint: "minutes" },
  { metric: AppleWatchMetric.DAYLIGHT_MINUTES, label: "Lumière du jour", unit: "min", unitHint: "minutes" },
  { metric: AppleWatchMetric.WATER_CONSUMPTION, label: "Eau", unit: "", unitHint: "unité de votre choix" },
];

export const healthMetricInfo = (metric: AppleWatchMetric): HealthMetricInfo | undefined =>
  HEALTH_METRICS.find(info => info.metric === metric);

/** Durées que le champ peut recevoir en heures ou en minutes. */
const DURATION_METRICS: AppleWatchMetric[] = [
  AppleWatchMetric.SLEEP,
  AppleWatchMetric.SLEEP_DEEP,
  AppleWatchMetric.SLEEP_REM,
  AppleWatchMetric.SLEEP_CORE,
  AppleWatchMetric.SLEEP_AWAKE,
  AppleWatchMetric.EXERCISE_MINUTES,
];

export const isDurationMetric = (metric: AppleWatchMetric): boolean => DURATION_METRICS.includes(metric);

export const FIELD_UNIT_LABELS: Record<HealthFieldUnit, string> = { hours: "heures", minutes: "minutes" };

const FIELD_UNIT_SHORT: Record<HealthFieldUnit, string> = { hours: "h", minutes: "min" };

/** Unité dans laquelle un champ lié reçoit sa donnée : celle choisie pour une durée, sinon celle de la donnée. */
export const fieldUnitHint = (field: CustomField, metric: AppleWatchMetric): string => {
  if (isDurationMetric(metric) && field.appleWatchUnit) return FIELD_UNIT_LABELS[field.appleWatchUnit];
  return healthMetricInfo(metric)?.unitHint ?? "";
};

/** "7,2 h", "4 210", ou la valeur telle quelle si elle n'est pas numérique (heure de coucher). */
export const formatHealthValue = (metric: AppleWatchMetric, raw: string, fieldUnit?: HealthFieldUnit): string => {
  const info = healthMetricInfo(metric);
  const unit = fieldUnit && isDurationMetric(metric) ? FIELD_UNIT_SHORT[fieldUnit] : info?.unit;
  const number = Number(raw.replace(",", "."));
  const text = Number.isFinite(number) && raw.trim() !== "" && !raw.includes(":")
    ? number.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    : raw;
  return unit ? `${text} ${unit}` : text;
};
