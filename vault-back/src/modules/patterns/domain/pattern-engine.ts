import {
  RankCorrelator,
  blockPermutationPValue,
  collectPairs,
  observedStatistic,
  skipReason,
} from './association-test.js';
import {
  BEFORE_DIFFICULT_Q,
  MIN_OCCURRENCES_BEFORE,
  binaryItemsOf,
  compareBeforeDifficultDays,
  findDifficultDays,
} from './before-difficult-days.js';
import { findChangePoint } from './change-points.js';
import { fieldColumnKey } from './daily-matrix.js';
import {
  computeEffect,
  isFavourable,
  pickExampleDates,
} from './finding-details.js';
import type { InsightTarget } from './insight-target.js';
import {
  PATTERN_ENGINE_VERSION,
  type BeforeDifficultDays,
  type ChangePointFinding,
  type ColumnCategory,
  type ColumnKind,
  type DailyMatrix,
  type FindingStrength,
  type Lag,
  type MatrixColumn,
  type PatternFinding,
  type PatternReport,
  type TargetReport,
} from './pattern-types.js';
import { hashSeed } from './prng.js';
import { findScoreTextGaps } from './score-text-gaps.js';
import { encodeSeries, type EncodedSeries } from './series.js';
import { benjaminiHochberg } from './stats.js';

export const REQUIRED_LOGGED_DAYS = 30;
export const DEFAULT_PERMUTATIONS = 2000;
export const DEFAULT_CHANGE_POINT_PERMUTATIONS = 1000;
export const SOLID_Q = 0.1;
export const SOLID_MIN_RHO = 0.25;
export const LEAD_P = 0.05;
export const LEAD_MIN_RHO = 0.2;
export const NO_LOG_PREVIOUS_DAY_KEY = 'no_log_previous_day';
export const OVERALL_TONE_KEY = 'overall_tone';

const SAME_DAY_CATEGORIES: ColumnCategory[] = [
  'field',
  'body',
  'event',
  'theme',
  'person',
];

export interface PatternEngineOptions {
  userId: string;
  computedAt: string;
  permutations?: number;
  changePointPermutations?: number;
}

interface Predictor {
  key: string;
  label: string;
  category: ColumnCategory;
  kind: ColumnKind;
  series: EncodedSeries;
  /** Whether the test controls for the target of the previous day. */
  allowsPartial: boolean;
}

interface ResolvedTarget {
  fieldId: string;
  column: MatrixColumn;
  higherIsBetter: boolean;
  series: EncodedSeries;
}

interface RawTest {
  targetIndex: number;
  predictor: Predictor;
  lag: Lag;
  partial: boolean;
  rho: number;
  n: number;
  p: number;
}

export function classifyStrength(
  q: number,
  p: number,
  rho: number,
): FindingStrength | null {
  const strength = Math.abs(rho);
  if (q < SOLID_Q && strength >= SOLID_MIN_RHO) return 'solide';
  if (p < LEAD_P && strength >= LEAD_MIN_RHO) return 'piste';
  return null;
}

function emptyReport(
  matrix: DailyMatrix,
  options: PatternEngineOptions,
  status: PatternReport['status'],
): PatternReport {
  return {
    engineVersion: PATTERN_ENGINE_VERSION,
    computedAt: options.computedAt,
    daysCovered: matrix.dates.length,
    daysLogged: matrix.logged.reduce((sum, flag) => sum + flag, 0),
    status,
    requiredLoggedDays: REQUIRED_LOGGED_DAYS,
    targets: [],
    stateChangePoints: [],
  };
}

function buildPredictors(
  matrix: DailyMatrix,
  targetKey: string,
  lag: Lag,
  encodedByKey: Map<string, EncodedSeries>,
): Predictor[] {
  return matrix.columns
    .filter((column) => column.key !== targetKey)
    .filter(
      (column) => lag === 1 || SAME_DAY_CATEGORIES.includes(column.category),
    )
    .map(
      (column): Predictor => ({
        key: column.key,
        label: column.label,
        category: column.category,
        kind: column.kind,
        series: encodedByKey.get(column.key) as EncodedSeries,
        allowsPartial: lag === 1,
      }),
    );
}

function runAssociationTests(
  matrix: DailyMatrix,
  targets: ResolvedTarget[],
  options: PatternEngineOptions,
): RawTest[] {
  const permutations = options.permutations ?? DEFAULT_PERMUTATIONS;
  const correlator = new RankCorrelator(matrix.dates.length);
  const encodedByKey = new Map(
    matrix.columns.map((column) => [column.key, encodeSeries(column.values)]),
  );
  const noLogPreviousDay: Predictor = {
    key: NO_LOG_PREVIOUS_DAY_KEY,
    label: 'Veille sans saisie',
    category: 'logging',
    kind: 'binary',
    series: encodeSeries(matrix.logged.map((flag) => 1 - flag)),
    allowsPartial: false,
  };

  const tests: RawTest[] = [];
  targets.forEach((target, targetIndex) => {
    for (const lag of [0, 1] as const) {
      const predictors = buildPredictors(
        matrix,
        target.column.key,
        lag,
        encodedByKey,
      );
      if (lag === 1) predictors.push(noLogPreviousDay);

      for (const predictor of predictors) {
        const partial = predictor.allowsPartial;
        const sample = collectPairs(
          predictor.series.values,
          target.series.values,
          lag,
          partial,
        );
        if (skipReason(sample, predictor.kind)) continue;
        const rho = observedStatistic(sample, partial);
        if (Number.isNaN(rho)) continue;
        const p = blockPermutationPValue({
          predictor: predictor.series,
          target: target.series,
          lag,
          partial,
          observed: rho,
          seed: hashSeed(
            `${options.userId}|${target.column.key}|${predictor.key}|${lag}`,
          ),
          permutations,
          correlator,
        });
        tests.push({
          targetIndex,
          predictor,
          lag,
          partial,
          rho,
          n: sample.predictor.length,
          p,
        });
      }
    }
  });
  return tests;
}

function toFinding(
  test: RawTest,
  q: number,
  strength: FindingStrength,
  target: ResolvedTarget,
  matrix: DailyMatrix,
): PatternFinding {
  const sample = collectPairs(
    test.predictor.series.values,
    target.series.values,
    test.lag,
    test.partial,
  );
  const effect = computeEffect(sample, test.predictor.kind);
  return {
    key: test.predictor.key,
    label: test.predictor.label,
    category: test.predictor.category,
    lag: test.lag,
    rho: test.rho,
    partial: test.partial,
    n: test.n,
    p: test.p,
    q,
    strength,
    effect,
    favourable: isFavourable(effect, test.rho, target.higherIsBetter),
    exampleDates: pickExampleDates(
      sample,
      test.predictor.kind,
      test.rho,
      matrix.dates,
    ),
  };
}

function buildFindings(
  tests: RawTest[],
  targets: ResolvedTarget[],
  matrix: DailyMatrix,
): PatternFinding[][] {
  const adjusted = benjaminiHochberg(tests.map((test) => test.p));
  const byTarget: PatternFinding[][] = targets.map(() => []);
  tests.forEach((test, index) => {
    const strength = classifyStrength(adjusted[index], test.p, test.rho);
    if (!strength) return;
    byTarget[test.targetIndex].push(
      toFinding(
        test,
        adjusted[index],
        strength,
        targets[test.targetIndex],
        matrix,
      ),
    );
  });
  for (const findings of byTarget) {
    findings.sort(
      (left, right) =>
        Number(right.strength === 'solide') -
          Number(left.strength === 'solide') ||
        left.q - right.q ||
        Math.abs(right.rho) - Math.abs(left.rho),
    );
  }
  return byTarget;
}

function analyseBeforeDifficultDays(
  matrix: DailyMatrix,
  targets: ResolvedTarget[],
): (BeforeDifficultDays | null)[] {
  const perTarget = targets.map((target) => {
    const difficult = findDifficultDays(
      target.series.values,
      target.higherIsBetter,
    );
    if (!difficult) return null;
    const items = binaryItemsOf(
      matrix.columns.filter((column) => column.key !== target.column.key),
    );
    return {
      difficultCount: difficult.filter(Boolean).length,
      results: compareBeforeDifficultDays(difficult, items),
    };
  });

  const everyResult = perTarget.flatMap((entry) => entry?.results ?? []);
  const adjusted = benjaminiHochberg(everyResult.map((result) => result.p));
  everyResult.forEach((result, index) => {
    result.q = adjusted[index];
  });
  return perTarget.map((entry) => {
    if (!entry) return null;
    const items = entry.results
      .filter(
        (result) =>
          result.q < BEFORE_DIFFICULT_Q &&
          result.countBefore >= MIN_OCCURRENCES_BEFORE,
      )
      .sort((left, right) => left.q - right.q);
    return { difficultDayCount: entry.difficultCount, items };
  });
}

function countObserved(series: Float64Array): number {
  return series.reduce((sum, value) => sum + (Number.isNaN(value) ? 0 : 1), 0);
}

function findChangePoints(
  columns: {
    key: string;
    label: string;
    series: EncodedSeries;
    higherIsBetter?: boolean;
  }[],
  matrix: DailyMatrix,
  options: PatternEngineOptions,
): ChangePointFinding[] {
  const permutations =
    options.changePointPermutations ?? DEFAULT_CHANGE_POINT_PERMUTATIONS;
  return columns
    .map((column) =>
      findChangePoint({
        key: column.key,
        label: column.label,
        series: column.series.values,
        dates: matrix.dates,
        seed: hashSeed(`${options.userId}|change|${column.key}`),
        permutations,
        higherIsBetter: column.higherIsBetter,
      }),
    )
    .filter((finding): finding is ChangePointFinding => finding !== null);
}

function resolveTargets(
  matrix: DailyMatrix,
  targets: InsightTarget[],
): ResolvedTarget[] {
  const resolved: ResolvedTarget[] = [];
  for (const target of targets) {
    const column = matrix.columns.find(
      (candidate) => candidate.key === fieldColumnKey(target.fieldId),
    );
    if (!column) continue;
    const series = encodeSeries(column.values);
    if (countObserved(series.values) === 0) continue;
    resolved.push({
      fieldId: target.fieldId,
      column,
      higherIsBetter: target.direction === 'HIGHER_IS_BETTER',
      series,
    });
  }
  return resolved;
}

/**
 * Runs the whole deterministic analysis on a daily matrix. No randomness other than seeded
 * permutations is involved, so the same data always gives the same report.
 */
export function computePatternReport(
  matrix: DailyMatrix,
  targets: InsightTarget[],
  options: PatternEngineOptions,
): PatternReport {
  const report = emptyReport(matrix, options, 'ok');
  if (report.daysLogged < REQUIRED_LOGGED_DAYS) {
    return { ...report, status: 'insufficient_data' };
  }
  const resolved = resolveTargets(matrix, targets);
  if (resolved.length === 0) return { ...report, status: 'no_targets' };

  const tests = runAssociationTests(matrix, resolved, options);
  const findings = buildFindings(tests, resolved, matrix);
  const beforeDifficult = analyseBeforeDifficultDays(matrix, resolved);
  const toneColumn = matrix.columns.find((c) => c.key === OVERALL_TONE_KEY);
  const toneSeries = toneColumn ? encodeSeries(toneColumn.values).values : null;

  const targetReports = resolved.map(
    (target, index): TargetReport => ({
      fieldId: target.fieldId,
      key: target.column.key,
      label: target.column.label,
      direction: target.higherIsBetter ? 'HIGHER_IS_BETTER' : 'LOWER_IS_BETTER',
      testsRun: tests.filter((test) => test.targetIndex === index).length,
      findings: findings[index],
      beforeDifficultDays: beforeDifficult[index],
      changePoints: findChangePoints(
        [
          {
            key: target.column.key,
            label: target.column.label,
            series: target.series,
            higherIsBetter: target.higherIsBetter,
          },
        ],
        matrix,
        options,
      ),
      scoreTextGaps: toneSeries
        ? findScoreTextGaps(
            target.series.values,
            toneSeries,
            target.higherIsBetter,
            matrix.dates,
          )
        : [],
    }),
  );

  const stateColumns = matrix.columns
    .filter((column) => column.category === 'state')
    .map((column) => ({
      key: column.key,
      label: column.label,
      series: encodeSeries(column.values),
    }));

  return {
    ...report,
    targets: targetReports,
    stateChangePoints: findChangePoints(stateColumns, matrix, options),
  };
}
