import { FieldType } from '../../health/domain/enums/field-type.enum.js';
import {
  effectiveConstruct,
  type ConstructFieldSource,
} from '../../signals/domain/constructs.js';
import type { LinguisticMarkers } from '../../signals/domain/linguistic-markers.js';
import type { Person } from '../../signals/domain/person.js';
import {
  buildQuestionBank,
  personPresentKey,
  personToneKey,
  type BankQuestion,
} from '../../signals/domain/question-bank.js';
import type { SignalView } from '../../signals/domain/signal-view.js';
import type { DailyMatrix, MatrixColumn } from './pattern-types.js';

/** A score read with less confidence than this is treated as unknown. */
export const MIN_SCORE_CONFIDENCE = 0.3;
/** A person's tone only counts when the person was present with at least this probability. */
export const MIN_PERSON_PRESENCE = 0.5;

export interface MatrixField extends ConstructFieldSource {
  id: string;
  name: string;
  fieldType: FieldType;
  isActive: boolean;
  optionsOrder?: string[];
  appleWatchMetric?: string;
}

/** A value of a text field that the user wants to understand, turned into a yes/no column. */
export interface MatrixValueTarget {
  fieldId: string;
  value: string;
}

export function valueColumnKey(fieldId: string, value: string): string {
  return `${fieldColumnKey(fieldId)}=${value}`;
}

export interface MatrixDaySignals {
  /** Views with the user corrections already applied. */
  views: SignalView[];
  markers: LinguisticMarkers;
}

export interface MatrixDayInput {
  /** Local calendar date of the log, "YYYY-MM-DD". */
  date: string;
  /** Raw field values by field id. */
  fieldValues: ReadonlyMap<string, string>;
  /** Fresh signals of the day, null when there are none. */
  signals: MatrixDaySignals | null;
}

export const FIELD_COLUMN_PREFIX = 'field:';

export function fieldColumnKey(fieldId: string): string {
  return `${FIELD_COLUMN_PREFIX}${fieldId}`;
}

const DAY_MS = 86_400_000;

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function dateOf(dayIndex: number): string {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

function parseFieldValue(
  field: MatrixField,
  raw: string | undefined,
): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  if (field.fieldType === FieldType.NUMBER) {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.fieldType === FieldType.BOOLEAN) {
    if (raw === 'true') return 1;
    return raw === 'false' ? 0 : null;
  }
  const position = field.optionsOrder?.indexOf(raw) ?? -1;
  return position >= 0 ? position : null;
}

function isUsableField(field: MatrixField): boolean {
  if (!field.isActive) return false;
  if (field.fieldType === FieldType.NUMBER) return true;
  if (field.fieldType === FieldType.BOOLEAN) return true;
  return (
    field.fieldType === FieldType.STRING &&
    (field.optionsOrder?.length ?? 0) > 0
  );
}

function buildFieldColumn(
  field: MatrixField,
  days: (MatrixDayInput | undefined)[],
): MatrixColumn {
  return {
    key: fieldColumnKey(field.id),
    label: field.name,
    category: field.appleWatchMetric ? 'body' : 'field',
    kind: field.fieldType === FieldType.BOOLEAN ? 'binary' : 'continuous',
    construct: effectiveConstruct(field),
    fieldId: field.id,
    values: days.map((day) =>
      day ? parseFieldValue(field, day.fieldValues.get(field.id)) : null,
    ),
  };
}

/**
 * 1 on the logged days where the field equals the value, 0 on logged days with another value,
 * null when the field is empty that day (or the day has no log).
 */
function buildValueColumn(
  field: MatrixField,
  value: string,
  days: (MatrixDayInput | undefined)[],
): MatrixColumn {
  return {
    key: valueColumnKey(field.id, value),
    label: `${field.name} : ${value}`,
    category: 'field',
    kind: 'binary',
    construct: effectiveConstruct(field),
    fieldId: field.id,
    targetOnly: true,
    values: days.map((day) => {
      const raw = day?.fieldValues.get(field.id);
      if (raw === undefined || raw.trim() === '') return null;
      return raw === value ? 1 : 0;
    }),
  };
}

function buildValueColumns(
  days: (MatrixDayInput | undefined)[],
  fields: MatrixField[],
  valueTargets: MatrixValueTarget[],
): MatrixColumn[] {
  const columns: MatrixColumn[] = [];
  const seen = new Set<string>();
  for (const target of valueTargets) {
    const key = valueColumnKey(target.fieldId, target.value);
    const field = fields.find((candidate) => candidate.id === target.fieldId);
    if (seen.has(key) || !field?.isActive) continue;
    if (field.fieldType !== FieldType.STRING) continue;
    seen.add(key);
    columns.push(buildValueColumn(field, target.value, days));
  }
  return columns;
}

function signalValue(
  view: SignalView | undefined,
  question: BankQuestion,
): number | null {
  if (!view) return null;
  if (question.type === 'noul') return view.value;
  return (view.confidence ?? 0) < MIN_SCORE_CONFIDENCE ? null : view.value;
}

function buildSignalColumns(
  days: (MatrixDayInput | undefined)[],
  people: Person[],
): MatrixColumn[] {
  const viewsByDay = days.map(
    (day) => new Map(day?.signals?.views.map((view) => [view.key, view])),
  );
  const toneOwner = new Map(
    people.map((person) => [personToneKey(person.id), person]),
  );

  return buildQuestionBank(people).map((question): MatrixColumn => {
    const tonePerson = toneOwner.get(question.key);
    const values = viewsByDay.map((views): number | null => {
      if (tonePerson) {
        const present = views.get(personPresentKey(tonePerson.id));
        if ((present?.value ?? 0) < MIN_PERSON_PRESENCE) return null;
      }
      return signalValue(views.get(question.key), question);
    });
    const isPersonTone = tonePerson !== undefined;
    return {
      key: question.key,
      label: isPersonTone ? `${question.label} (ton)` : question.label,
      category: question.category,
      construct: question.construct,
      kind: question.type === 'noul' ? 'binary' : 'continuous',
      ...(question.type === 'score' && {
        notableEnd: question.lowEndIsNotable
          ? ('low' as const)
          : ('high' as const),
      }),
      values,
    };
  });
}

function buildMarkerColumns(
  days: (MatrixDayInput | undefined)[],
): MatrixColumn[] {
  const marker = (
    key: string,
    label: string,
    read: (markers: LinguisticMarkers) => number,
  ): MatrixColumn => ({
    key,
    label,
    category: 'language',
    construct: 'language',
    kind: 'continuous',
    values: days.map((day) =>
      day?.signals ? read(day.signals.markers) : null,
    ),
  });
  return [
    marker('word_count', 'Longueur de la note', (m) => m.wordCount),
    marker('absolutist_ratio', 'Mots absolus', (m) => m.absolutistRatio),
    marker(
      'first_person_ratio',
      'Mots à la première personne',
      (m) => m.firstPersonRatio,
    ),
  ];
}

/**
 * Builds the daily matrix: one row per calendar day between the first and the last log.
 * Log dates are already local calendar dates of the user, so no time zone conversion is needed.
 * Days without a log are null in every column. Columns without any value are dropped.
 * Value targets add one yes/no column each, which can only be a target.
 */
export function buildDailyMatrix(
  logs: MatrixDayInput[],
  fields: MatrixField[],
  people: Person[],
  valueTargets: MatrixValueTarget[] = [],
): DailyMatrix {
  if (logs.length === 0) return { dates: [], logged: [], columns: [] };

  const byDay = new Map(logs.map((log) => [dayNumber(log.date), log]));
  const dayNumbers = [...byDay.keys()];
  const first = Math.min(...dayNumbers);
  const last = Math.max(...dayNumbers);

  const dates: string[] = [];
  const days: (MatrixDayInput | undefined)[] = [];
  for (let day = first; day <= last; day++) {
    dates.push(dateOf(day));
    days.push(byDay.get(day));
  }

  const columns = [
    ...fields
      .filter(isUsableField)
      .map((field) => buildFieldColumn(field, days)),
    ...buildValueColumns(days, fields, valueTargets),
    ...buildSignalColumns(days, people),
    ...buildMarkerColumns(days),
  ].filter((column) => column.values.some((value) => value !== null));

  return {
    dates,
    logged: days.map((day) => (day ? 1 : 0)),
    columns,
  };
}
