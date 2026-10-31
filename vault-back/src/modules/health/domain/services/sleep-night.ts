export interface SleepSample {
  value: string;
  start: Date;
  end: Date;
}

export type SleepCategory = 'asleep' | 'in_bed' | 'awake' | 'unknown';

export interface SleepNightSummary {
  asleepHours: number;
  /** Time of day of the first sleep sample, as decimal hours in the user's timezone. */
  bedtimeHour: number;
  source: 'asleep' | 'in_bed';
}

export type SleepStage = 'deep' | 'rem' | 'core' | 'awake';

/** Hours per stage over the night window; a stage without any sample is absent, not 0. */
export type SleepStageHours = Partial<Record<SleepStage, number>>;

export interface SleepNightResult {
  summary: SleepNightSummary | null;
  stages: SleepStageHours;
  unknownLabels: string[];
  unknownSampleCount: number;
}

interface Interval {
  start: number;
  end: number;
}

const MS_PER_HOUR = 3_600_000;
const WINDOW_START_HOUR = 18;
const MAX_LABEL_LENGTH = 40;
const MAX_UNKNOWN_LABELS = 20;

const ASLEEP_LABELS = new Set([
  'asleep',
  'asleepcore',
  'asleepdeep',
  'asleeprem',
  'asleepunspecified',
  'core',
  'deep',
  'rem',
  'endormi',
  'endormie',
  'sommeilleger',
  'sommeilcentral',
  'sommeilessentiel',
  'sommeilparadoxal',
  'sommeilprofond',
  'paradoxal',
  'profond',
  'leger',
  'essentiel',
  'central',
  // French iOS names core sleep "Lent" (seen on a real phone)
  'lent',
  'sommeillent',
]);
const IN_BED_LABELS = new Set(['inbed', 'aulit']);
const AWAKE_LABELS = new Set([
  'awake',
  'eveille',
  'eveillee',
  'reveille',
  'reveillee',
]);

const STAGE_LABELS: Record<SleepStage, Set<string>> = {
  deep: new Set(['deep', 'asleepdeep', 'profond', 'sommeilprofond']),
  rem: new Set(['rem', 'asleeprem', 'paradoxal', 'sommeilparadoxal']),
  core: new Set([
    'core',
    'asleepcore',
    'leger',
    'sommeilleger',
    'essentiel',
    'sommeilessentiel',
    'central',
    'sommeilcentral',
    'lent',
    'sommeillent',
  ]),
  awake: AWAKE_LABELS,
};

function compactLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function classifySleepLabel(label: string): SleepCategory {
  const compact = compactLabel(label);
  if (ASLEEP_LABELS.has(compact)) return 'asleep';
  if (IN_BED_LABELS.has(compact)) return 'in_bed';
  if (AWAKE_LABELS.has(compact)) return 'awake';
  return 'unknown';
}

export function classifySleepStage(label: string): SleepStage | null {
  const compact = compactLabel(label);
  for (const stage of Object.keys(STAGE_LABELS) as SleepStage[]) {
    if (STAGE_LABELS[stage].has(compact)) return stage;
  }
  return null;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(instant: number, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instant))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function offsetAt(instant: number, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC instant of a wall-clock time in a timezone (the day may overflow, it is normalized). */
export function zonedWallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
  minute: number = 0,
  second: number = 0,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstPass = guess - offsetAt(guess, timeZone);
  return guess - offsetAt(firstPass, timeZone);
}

function nightWindow(date: string, timeZone: string): Interval {
  const [year, month, day] = date.split('-').map(Number);
  return {
    start: zonedWallTimeToInstant(
      year,
      month,
      day - 1,
      WINDOW_START_HOUR,
      timeZone,
    ),
    end: zonedWallTimeToInstant(year, month, day, WINDOW_START_HOUR, timeZone),
  };
}

function clip(sample: SleepSample, window: Interval): Interval | null {
  const start = Math.max(sample.start.getTime(), window.start);
  const end = Math.min(sample.end.getTime(), window.end);
  return end > start ? { start, end } : null;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function decimalHourOfDay(instant: number, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  return parts.hour + parts.minute / 60 + parts.second / 3600;
}

function summarize(
  intervals: Interval[],
  source: SleepNightSummary['source'],
  timeZone: string,
): SleepNightSummary | null {
  const merged = mergeIntervals(intervals);
  if (merged.length === 0) return null;
  const totalMs = merged.reduce((sum, i) => sum + (i.end - i.start), 0);
  return {
    asleepHours: totalMs / MS_PER_HOUR,
    bedtimeHour: decimalHourOfDay(merged[0].start, timeZone),
    source,
  };
}

/**
 * Sleep of the night that ends on `date` (the user's local day): the window runs from the
 * previous day 18:00 to `date` 18:00 in the user's timezone. Only asleep stages count, and
 * overlapping samples (several stages, several sources) are merged so no minute counts twice.
 * Without any asleep stage, the merged "in bed" time is used instead.
 */
export function computeSleepNight(
  samples: SleepSample[],
  date: string,
  timeZone: string,
): SleepNightResult {
  const window = nightWindow(date, timeZone);
  const asleep: Interval[] = [];
  const inBed: Interval[] = [];
  const stageIntervals: Record<SleepStage, Interval[]> = {
    deep: [],
    rem: [],
    core: [],
    awake: [],
  };
  const unknownLabels = new Set<string>();
  let unknownSampleCount = 0;

  for (const sample of samples) {
    const category = classifySleepLabel(sample.value);
    if (category === 'unknown') {
      unknownSampleCount++;
      if (unknownLabels.size < MAX_UNKNOWN_LABELS) {
        unknownLabels.add(sample.value.trim().slice(0, MAX_LABEL_LENGTH));
      }
      continue;
    }
    const interval = clip(sample, window);
    if (!interval) continue;
    if (category === 'asleep') asleep.push(interval);
    if (category === 'in_bed') inBed.push(interval);
    const stage = classifySleepStage(sample.value);
    if (stage) stageIntervals[stage].push(interval);
  }

  const stages: SleepStageHours = {};
  for (const stage of Object.keys(stageIntervals) as SleepStage[]) {
    const merged = mergeIntervals(stageIntervals[stage]);
    if (merged.length === 0) continue;
    const totalMs = merged.reduce((sum, i) => sum + (i.end - i.start), 0);
    stages[stage] = totalMs / MS_PER_HOUR;
  }

  const summary =
    summarize(asleep, 'asleep', timeZone) ??
    summarize(inBed, 'in_bed', timeZone);

  return {
    summary,
    stages,
    unknownLabels: [...unknownLabels],
    unknownSampleCount,
  };
}

const OFFSET_SUFFIX = /(Z|[+-]\d{2}(:?\d{2})?)$/i;
const WALL_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:[.,]\d+)?$/;

/**
 * Instant of an ISO 8601 string. A string without UTC offset is read as a wall-clock time of
 * the user's timezone, because the server runs in UTC and Shortcuts may omit the offset.
 */
export function parseSleepInstant(
  value: string,
  timeZone: string,
): Date | null {
  const text = value.trim();
  if (OFFSET_SUFFIX.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const match = WALL_TIME.exec(text);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    zonedWallTimeToInstant(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      timeZone,
      Number(minute),
      Number(second ?? 0),
    ),
  );
}

export interface RawSleepSample {
  value: string;
  start: string;
  end: string;
}

/** Parses the "label|start|end" lines sent by the shortcut; malformed lines are dropped. */
export function parseSleepLines(text: string): RawSleepSample[] {
  const samples: RawSleepSample[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length !== 3 || parts.some((part) => part === '')) continue;
    samples.push({ value: parts[0], start: parts[1], end: parts[2] });
  }
  return samples;
}
