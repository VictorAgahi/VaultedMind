import {
  PERMUTATION_BLOCK_DAYS,
  blockPermutation,
} from './block-permutation.js';
import { mulberry32 } from './prng.js';
import type { ChangePointFinding } from './pattern-types.js';
import { mean, standardDeviation } from './stats.js';

export const MIN_SEGMENT_DAYS = 14;
export const CHANGE_POINT_P = 0.05;
export const CHANGE_POINT_MIN_SD = 0.5;

interface BestSplit {
  /** Index in the observations of the first value after the change. */
  splitIndex: number;
  difference: number;
}

/** Split of the observations maximizing the absolute difference of means. */
function bestSplit(
  observations: Float64Array,
  minSegment: number,
): BestSplit | null {
  const count = observations.length;
  if (count < 2 * minSegment) return null;
  let total = 0;
  for (let index = 0; index < count; index++) total += observations[index];

  let best: BestSplit | null = null;
  let before = 0;
  for (let index = 0; index < count - minSegment; index++) {
    before += observations[index];
    const beforeCount = index + 1;
    if (beforeCount < minSegment) continue;
    const afterCount = count - beforeCount;
    const difference = (total - before) / afterCount - before / beforeCount;
    if (best === null || Math.abs(difference) > Math.abs(best.difference)) {
      best = { splitIndex: beforeCount, difference };
    }
  }
  return best;
}

function compact(series: Float64Array, order: Int32Array | null): Float64Array {
  const kept: number[] = [];
  for (let day = 0; day < series.length; day++) {
    const value = series[order ? order[day] : day];
    if (!Number.isNaN(value)) kept.push(value);
  }
  return Float64Array.from(kept);
}

export interface ChangePointInput {
  key: string;
  label: string;
  series: Float64Array;
  dates: string[];
  seed: number;
  permutations: number;
  /** Set for a target: tells whether a rise is the favourable direction. */
  higherIsBetter?: boolean;
}

/**
 * Looks for one mean shift in a series. The p-value comes from the best split of
 * block-permuted copies of the series (7-day blocks), so autocorrelation is respected.
 * Reported when p < 0.05 and the shift is at least half a standard deviation.
 */
export function findChangePoint(
  input: ChangePointInput,
): ChangePointFinding | null {
  const observations = compact(input.series, null);
  const observed = bestSplit(observations, MIN_SEGMENT_DAYS);
  if (!observed) return null;

  const spread = standardDeviation(observations);
  const differenceInSd = Math.abs(observed.difference) / spread;
  if (!(spread > 0) || differenceInSd < CHANGE_POINT_MIN_SD) return null;

  const random = mulberry32(input.seed);
  const order = new Int32Array(input.series.length);
  let exceedances = 0;
  for (let round = 0; round < input.permutations; round++) {
    blockPermutation(
      input.series.length,
      PERMUTATION_BLOCK_DAYS,
      random,
      order,
    );
    const permuted = bestSplit(compact(input.series, order), MIN_SEGMENT_DAYS);
    if (
      permuted &&
      Math.abs(permuted.difference) >= Math.abs(observed.difference) - 1e-12
    ) {
      exceedances++;
    }
  }
  const p = (exceedances + 1) / (input.permutations + 1);
  if (p >= CHANGE_POINT_P) return null;

  const dayOfObservation: number[] = [];
  input.series.forEach((value, day) => {
    if (!Number.isNaN(value)) dayOfObservation.push(day);
  });
  const meanBefore = mean(observations.subarray(0, observed.splitIndex));
  const meanAfter = mean(observations.subarray(observed.splitIndex));
  return {
    key: input.key,
    label: input.label,
    date: input.dates[dayOfObservation[observed.splitIndex]],
    meanBefore,
    meanAfter,
    difference: meanAfter - meanBefore,
    differenceInSd,
    p,
    favourable:
      input.higherIsBetter === undefined
        ? null
        : meanAfter > meanBefore === input.higherIsBetter,
  };
}
