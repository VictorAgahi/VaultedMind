// Calculs du tableau de bord faits sur l'appareil : bilan de la semaine, tendance, objectifs.
import { CustomField, DailyLog, FieldType } from "@/types";
import { localDateStr } from "./local-date";

const DAY_MS = 86_400_000;

const logDay = (log: DailyLog): string => new Date(log.logDate).toISOString().split("T")[0];

const daysAgoStr = (days: number, now: Date): string => localDateStr(new Date(now.getTime() - days * DAY_MS));

const numericValue = (log: DailyLog, fieldId: string): number | null => {
  const raw = log.fieldValues?.find((fv) => fv.customFieldId === fieldId)?.value;
  if (raw === undefined || raw === "") return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
};

const logsBetween = (logs: DailyLog[], fromDaysAgo: number, toDaysAgo: number, now: Date): DailyLog[] => {
  const from = daysAgoStr(fromDaysAgo, now);
  const to = daysAgoStr(toDaysAgo, now);
  return logs.filter((log) => {
    const day = logDay(log);
    return day >= from && day <= to;
  });
};

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export interface WeeklySummary {
  daysLogged: number;
  moodAverage: number | null;
  moodPreviousAverage: number | null;
  bestDay?: { date: string; value: number; note?: string };
  hardestDay?: { date: string; value: number; note?: string };
  mostRegularHabit?: { name: string; days: number };
  reflection: string;
}

const REFLECTIONS = [
  "Qu'est-ce qui a rendu vos meilleurs jours différents ?",
  "Qu'aimeriez-vous garder de cette semaine ?",
  "De quoi auriez-vous besoin la semaine prochaine ?",
  "Quel petit changement aimeriez-vous essayer ?",
];

/** Bilan des 7 derniers jours. Renvoie null tant qu'il y a moins de 3 jours notés. */
export function weeklySummary(logs: DailyLog[], fields: CustomField[], moodField: CustomField | undefined, now = new Date()): WeeklySummary | null {
  const week = logsBetween(logs, 6, 0, now);
  if (week.length < 3) return null;
  const previous = logsBetween(logs, 13, 7, now);

  let bestDay: WeeklySummary["bestDay"];
  let hardestDay: WeeklySummary["hardestDay"];
  let moodAverage: number | null = null;
  let moodPreviousAverage: number | null = null;
  if (moodField) {
    const scored = week
      .map((log) => ({ log, value: numericValue(log, moodField.id) }))
      .filter((item): item is { log: DailyLog; value: number } => item.value !== null);
    moodAverage = mean(scored.map((s) => s.value));
    moodPreviousAverage = mean(previous.map((log) => numericValue(log, moodField.id)).filter((v): v is number => v !== null));
    if (scored.length >= 2) {
      const sorted = [...scored].sort((a, b) => b.value - a.value);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (top.value !== bottom.value) {
        bestDay = { date: logDay(top.log), value: top.value, note: top.log.notes || undefined };
        hardestDay = { date: logDay(bottom.log), value: bottom.value, note: bottom.log.notes || undefined };
      }
    }
  }

  let mostRegularHabit: WeeklySummary["mostRegularHabit"];
  fields
    .filter((f) => f.isActive && f.fieldType === FieldType.BOOLEAN)
    .forEach((field) => {
      const days = week.filter((log) => log.fieldValues?.some((fv) => fv.customFieldId === field.id && fv.value === "true")).length;
      if (days > 0 && (!mostRegularHabit || days > mostRegularHabit.days)) mostRegularHabit = { name: field.name, days };
    });

  const weekIndex = Math.floor(now.getTime() / (7 * DAY_MS));
  return {
    daysLogged: week.length,
    moodAverage,
    moodPreviousAverage,
    bestDay,
    hardestDay,
    mostRegularHabit,
    reflection: REFLECTIONS[weekIndex % REFLECTIONS.length],
  };
}

/**
 * Baisse durable de l'humeur : au moins 3 des 5 derniers jours sous la référence personnelle
 * (moyenne des 30 jours précédents moins 1,5 écart-type), ou une baisse de plus de 30 % d'une semaine à l'autre.
 */
export function hasSustainedLowMood(logs: DailyLog[], moodField: CustomField | undefined, now = new Date()): boolean {
  if (!moodField) return false;
  const baselineValues = logsBetween(logs, 35, 5, now)
    .map((log) => numericValue(log, moodField.id))
    .filter((v): v is number => v !== null);
  const recentValues = logsBetween(logs, 4, 0, now)
    .map((log) => numericValue(log, moodField.id))
    .filter((v): v is number => v !== null);
  if (baselineValues.length < 10 || recentValues.length < 3) return false;

  const baselineMean = mean(baselineValues) ?? 0;
  const sd = Math.sqrt(baselineValues.reduce((acc, v) => acc + (v - baselineMean) ** 2, 0) / baselineValues.length);
  const threshold = baselineMean - 1.5 * Math.max(sd, 0.5);
  const lowDays = recentValues.filter((v) => v < threshold).length;
  if (lowDays >= 3) return true;

  const thisWeek = mean(logsBetween(logs, 6, 0, now).map((l) => numericValue(l, moodField.id)).filter((v): v is number => v !== null));
  const lastWeek = mean(logsBetween(logs, 13, 7, now).map((l) => numericValue(l, moodField.id)).filter((v): v is number => v !== null));
  const min = moodField.min ?? 0;
  if (thisWeek !== null && lastWeek !== null && lastWeek - min > 0) {
    return (lastWeek - thisWeek) / (lastWeek - min) > 0.3;
  }
  return false;
}

export interface GoalProgress {
  field: CustomField;
  /** Jours "oui" (habitude) ou moyenne de la semaine (mesure). */
  current: number;
  target: number;
  reached: boolean;
  /** Part de l'objectif atteinte, de 0 à 1. */
  ratio: number;
  unit: "days" | "average";
}

/** Progression des objectifs sur la semaine en cours (lundi à aujourd'hui). */
export function weeklyGoalProgress(logs: DailyLog[], fields: CustomField[], now = new Date()): GoalProgress[] {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const week = logsBetween(logs, daysSinceMonday, 0, now);
  return fields
    .filter((f) => f.isActive && typeof f.goalTarget === "number" && f.goalTarget > 0)
    .map((field) => {
      const target = field.goalTarget as number;
      const direction = field.goalDirection ?? "AT_LEAST";
      if (field.fieldType === FieldType.BOOLEAN) {
        const current = week.filter((log) => log.fieldValues?.some((fv) => fv.customFieldId === field.id && fv.value === "true")).length;
        const reached = direction === "AT_LEAST" ? current >= target : current <= target;
        const ratio = direction === "AT_LEAST" ? Math.min(1, current / target) : current <= target ? 1 : Math.max(0, target / current);
        return { field, current, target, reached, ratio, unit: "days" as const };
      }
      const average = mean(week.map((log) => numericValue(log, field.id)).filter((v): v is number => v !== null)) ?? 0;
      const reached = direction === "AT_LEAST" ? average >= target : average > 0 && average <= target;
      const ratio = direction === "AT_LEAST" ? Math.min(1, average / target) : average === 0 ? 0 : Math.min(1, target / average);
      return { field, current: Math.round(average * 10) / 10, target, reached, ratio, unit: "average" as const };
    });
}
