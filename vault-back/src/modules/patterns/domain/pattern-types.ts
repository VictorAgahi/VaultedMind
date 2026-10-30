import type { ConstructKey } from '../../signals/domain/constructs.js';
import type { TargetDirection } from './insight-target.js';

export const PATTERN_ENGINE_VERSION = 'patterns-v2';

export type ColumnCategory =
  | 'field'
  | 'body'
  | 'event'
  | 'theme'
  | 'state'
  | 'person'
  | 'language'
  | 'logging';

export type ColumnKind = 'binary' | 'continuous';

export interface MatrixColumn {
  key: string;
  label: string;
  category: ColumnCategory;
  kind: ColumnKind;
  /** What the column measures; two columns of the same construct are never tested together. */
  construct: ConstructKey;
  /** Custom field the column comes from, so that a field is never its own predictor. */
  fieldId?: string;
  /** Value targets only: the column can be a target but never a predictor. */
  targetOnly?: boolean;
  /** Score columns only: which end of the scale is the notable one. */
  notableEnd?: 'high' | 'low';
  /** One value per calendar day, null when unknown. */
  values: (number | null)[];
}

/** One row per calendar day from the first to the last log. */
export interface DailyMatrix {
  /** Local calendar dates, "YYYY-MM-DD", consecutive. */
  dates: string[];
  /** 1 if a daily log exists that day, else 0. */
  logged: number[];
  columns: MatrixColumn[];
}

export type FindingStrength = 'solide' | 'piste';
export type Lag = 0 | 1;

export interface PatternEffect {
  kind: 'binary' | 'continuous';
  /** True when the target is a yes/no series: the means below are then frequencies in [0, 1]. */
  targetBinary?: boolean;
  /** Mean target when the predictor is high (yes, or top third). */
  meanWhenHigh: number;
  /** Mean target when the predictor is low (no, or bottom third). */
  meanWhenLow: number;
  countHigh: number;
  countLow: number;
  difference: number;
}

/** The AI reading of how obvious a link is: level 0 (surprising) to 3 (obvious to everyone). */
export interface LinkObviousness {
  level: number;
  confidence: number;
}

export interface PatternFinding {
  key: string;
  label: string;
  category: ColumnCategory;
  lag: Lag;
  rho: number;
  /** True when the correlation controls for the target of the previous day. */
  partial: boolean;
  n: number;
  p: number;
  q: number;
  strength: FindingStrength;
  effect: PatternEffect | null;
  /** Whether the effect goes the way the user wants; null when it cannot be told or for a neutral target. */
  favourable: boolean | null;
  /** Days of the predictor that best illustrate the finding. */
  exampleDates: string[];
  /** AI score of how expected the link is; null or absent when it could not be scored. */
  obviousness?: LinkObviousness | null;
}

export interface BeforeDifficultDaysItem {
  key: string;
  label: string;
  category: ColumnCategory;
  countBefore: number;
  daysBefore: number;
  countOther: number;
  daysOther: number;
  frequencyBefore: number;
  frequencyOther: number;
  /** Ratio of frequencies; null when the item never happens on other days. */
  lift: number | null;
  p: number;
  q: number;
}

export interface BeforeDifficultDays {
  difficultDayCount: number;
  items: BeforeDifficultDaysItem[];
}

export interface ChangePointFinding {
  key: string;
  label: string;
  /** First day of the segment after the change. */
  date: string;
  meanBefore: number;
  meanAfter: number;
  difference: number;
  /** Difference in units of the standard deviation of the whole series. */
  differenceInSd: number;
  p: number;
  /** For a target only: whether the change goes the way the user wants. */
  favourable: boolean | null;
}

export interface ScoreTextGap {
  date: string;
  targetValue: number;
  toneValue: number;
  targetPercentile: number;
  tonePercentile: number;
}

export interface TargetReport {
  fieldId: string;
  key: string;
  label: string;
  direction: TargetDirection;
  /** Value targets only: the text value whose presence is the target. */
  value?: string | null;
  /** True for a value target (1 when the field equals the value, else 0). */
  binary?: boolean;
  testsRun: number;
  findings: PatternFinding[];
  beforeDifficultDays: BeforeDifficultDays | null;
  changePoints: ChangePointFinding[];
  scoreTextGaps: ScoreTextGap[];
}

export type PatternReportStatus = 'ok' | 'insufficient_data' | 'no_targets';

export interface PatternReport {
  engineVersion: string;
  computedAt: string;
  daysCovered: number;
  daysLogged: number;
  status: PatternReportStatus;
  /** Logged days required before the engine runs. */
  requiredLoggedDays: number;
  targets: TargetReport[];
  /** Change points of the signals describing the user's state. */
  stateChangePoints: ChangePointFinding[];
}
