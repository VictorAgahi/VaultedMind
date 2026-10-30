import {
  PERMUTATION_BLOCK_DAYS,
  blockPermutation,
} from './block-permutation.js';
import { mulberry32 } from './prng.js';
import type { EncodedSeries } from './series.js';
import { partialFromCorrelations, pearson, spearman } from './stats.js';
import type { ColumnKind, Lag } from './pattern-types.js';

export const MIN_PAIRS = 20;
export const MIN_BINARY_SIDE = 8;
export const BINARY_THRESHOLD = 0.5;

/** Complete observations of a lagged test: predictor on day d, target on day d + lag. */
export interface PairedSample {
  predictor: number[];
  target: number[];
  /** Target of the previous day (day d), only collected for partial tests. */
  control: number[];
  /** Day index d of the predictor. */
  days: number[];
}

export function collectPairs(
  predictor: Float64Array,
  target: Float64Array,
  lag: Lag,
  withControl: boolean,
): PairedSample {
  const sample: PairedSample = {
    predictor: [],
    target: [],
    control: [],
    days: [],
  };
  for (let day = 0; day + lag < predictor.length; day++) {
    const predictorValue = predictor[day];
    const targetValue = target[day + lag];
    if (Number.isNaN(predictorValue) || Number.isNaN(targetValue)) continue;
    if (withControl && Number.isNaN(target[day])) continue;
    sample.predictor.push(predictorValue);
    sample.target.push(targetValue);
    if (withControl) sample.control.push(target[day]);
    sample.days.push(day);
  }
  return sample;
}

function hasEnoughOnBothSides(values: number[]): boolean {
  const high = values.filter((value) => value >= BINARY_THRESHOLD).length;
  return high >= MIN_BINARY_SIDE && values.length - high >= MIN_BINARY_SIDE;
}

/** Why a test cannot run on this sample, or null when it can. */
export function skipReason(
  sample: PairedSample,
  kind: ColumnKind,
): string | null {
  if (sample.predictor.length < MIN_PAIRS) return 'too_few_pairs';
  if (new Set(sample.predictor).size < 2) return 'constant_predictor';
  if (new Set(sample.target).size < 2) return 'constant_target';
  if (kind === 'binary' && !hasEnoughOnBothSides(sample.predictor)) {
    return 'unbalanced_binary';
  }
  return null;
}

/** Observed statistic: Spearman, or partial Spearman controlling for the previous target. */
export function observedStatistic(
  sample: PairedSample,
  partial: boolean,
): number {
  const direct = spearman(sample.predictor, sample.target);
  if (!partial) return direct;
  return partialFromCorrelations(
    direct,
    spearman(sample.predictor, sample.control),
    spearman(sample.target, sample.control),
  );
}

/**
 * Computes the same statistic as `observedStatistic` from dense rank codes with counting sorts,
 * so that thousands of permutations stay cheap. Buffers are reused between calls.
 */
export class RankCorrelator {
  private readonly predictorCodes: Int32Array;
  private readonly targetCodes: Int32Array;
  private readonly controlCodes: Int32Array;
  private readonly counts: Int32Array;
  private readonly less: Int32Array;
  private readonly predictorRanks: Float64Array;
  private readonly targetRanks: Float64Array;
  private readonly controlRanks: Float64Array;

  constructor(maxLength: number) {
    this.predictorCodes = new Int32Array(maxLength);
    this.targetCodes = new Int32Array(maxLength);
    this.controlCodes = new Int32Array(maxLength);
    this.counts = new Int32Array(maxLength + 1);
    this.less = new Int32Array(maxLength + 1);
    this.predictorRanks = new Float64Array(maxLength);
    this.targetRanks = new Float64Array(maxLength);
    this.controlRanks = new Float64Array(maxLength);
  }

  statistic(
    predictorCodes: Int32Array,
    target: EncodedSeries,
    lag: Lag,
    partial: boolean,
  ): number {
    let count = 0;
    const targetCodes = target.codes;
    for (let day = 0; day + lag < predictorCodes.length; day++) {
      const predictorCode = predictorCodes[day];
      const targetCode = targetCodes[day + lag];
      if (predictorCode < 0 || targetCode < 0) continue;
      if (partial && targetCodes[day] < 0) continue;
      this.predictorCodes[count] = predictorCode;
      this.targetCodes[count] = targetCode;
      if (partial) this.controlCodes[count] = targetCodes[day];
      count++;
    }
    if (count < 3) return NaN;

    const distinct = predictorCodes.length + 1;
    this.rank(this.predictorCodes, count, distinct, this.predictorRanks);
    this.rank(this.targetCodes, count, distinct, this.targetRanks);
    const predictorRanks = this.predictorRanks.subarray(0, count);
    const targetRanks = this.targetRanks.subarray(0, count);
    const direct = pearson(predictorRanks, targetRanks);
    if (!partial) return direct;

    this.rank(this.controlCodes, count, distinct, this.controlRanks);
    const controlRanks = this.controlRanks.subarray(0, count);
    return partialFromCorrelations(
      direct,
      pearson(predictorRanks, controlRanks),
      pearson(targetRanks, controlRanks),
    );
  }

  private rank(
    codes: Int32Array,
    count: number,
    distinct: number,
    out: Float64Array,
  ): void {
    this.counts.fill(0, 0, distinct);
    for (let index = 0; index < count; index++) this.counts[codes[index]]++;
    let running = 0;
    for (let code = 0; code < distinct; code++) {
      this.less[code] = running;
      running += this.counts[code];
    }
    for (let index = 0; index < count; index++) {
      const code = codes[index];
      out[index] = this.less[code] + (this.counts[code] + 1) / 2;
    }
  }
}

export interface PermutationInput {
  predictor: EncodedSeries;
  target: EncodedSeries;
  lag: Lag;
  partial: boolean;
  observed: number;
  seed: number;
  permutations: number;
  correlator: RankCorrelator;
}

/**
 * Two-sided p-value by block permutation: the predictor is shuffled in contiguous blocks
 * while the target stays fixed, which keeps the autocorrelation of both series.
 * p = (exceedances + 1) / (permutations + 1).
 */
export function blockPermutationPValue(input: PermutationInput): number {
  const { predictor, target, lag, partial, observed, permutations } = input;
  const length = predictor.codes.length;
  const random = mulberry32(input.seed);
  const order = new Int32Array(length);
  const shuffled = new Int32Array(length);
  const threshold = Math.abs(observed) - 1e-12;

  let exceedances = 0;
  for (let round = 0; round < permutations; round++) {
    blockPermutation(length, PERMUTATION_BLOCK_DAYS, random, order);
    for (let day = 0; day < length; day++) {
      shuffled[day] = predictor.codes[order[day]];
    }
    const statistic = input.correlator.statistic(
      shuffled,
      target,
      lag,
      partial,
    );
    if (!Number.isNaN(statistic) && Math.abs(statistic) >= threshold) {
      exceedances++;
    }
  }
  return (exceedances + 1) / (permutations + 1);
}
