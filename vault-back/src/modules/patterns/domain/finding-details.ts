import type { PairedSample } from './association-test.js';
import type { ColumnKind, PatternEffect } from './pattern-types.js';
import { mean } from './stats.js';

export const BINARY_HIGH = 0.7;
export const BINARY_LOW = 0.3;
export const MAX_EXAMPLE_DATES = 5;

function averageOf(values: number[], indices: number[]): number {
  return mean(indices.map((index) => values[index]));
}

/**
 * Mean target for high versus low predictor days, in the unit of the target
 * (a frequency in [0, 1] when the target is a yes/no series).
 * Binary predictors: >= 0.7 versus <= 0.3 (the middle is left out).
 * Continuous predictors: top third versus bottom third of the days.
 */
export function computeEffect(
  sample: PairedSample,
  kind: ColumnKind,
  targetBinary: boolean = false,
): PatternEffect | null {
  const count = sample.predictor.length;
  let highIndices: number[];
  let lowIndices: number[];
  if (kind === 'binary') {
    highIndices = [];
    lowIndices = [];
    sample.predictor.forEach((value, index) => {
      if (value >= BINARY_HIGH) highIndices.push(index);
      else if (value <= BINARY_LOW) lowIndices.push(index);
    });
  } else {
    const third = Math.floor(count / 3);
    const sorted = sample.predictor
      .map((value, index) => ({ value, index }))
      .sort(
        (left, right) => left.value - right.value || left.index - right.index,
      );
    lowIndices = sorted.slice(0, third).map((entry) => entry.index);
    highIndices = sorted.slice(count - third).map((entry) => entry.index);
  }
  if (highIndices.length === 0 || lowIndices.length === 0) return null;

  const meanWhenHigh = averageOf(sample.target, highIndices);
  const meanWhenLow = averageOf(sample.target, lowIndices);
  return {
    kind,
    ...(targetBinary && { targetBinary: true }),
    meanWhenHigh,
    meanWhenLow,
    countHigh: highIndices.length,
    countLow: lowIndices.length,
    difference: meanWhenHigh - meanWhenLow,
  };
}

/**
 * Favourable when the target moves the way the user wants when the predictor is high.
 * A neutral target (`higherIsBetter` null) has no favourable side.
 */
export function isFavourable(
  effect: PatternEffect | null,
  rho: number,
  higherIsBetter: boolean | null,
): boolean | null {
  if (higherIsBetter === null) return null;
  const direction = effect && effect.difference !== 0 ? effect.difference : rho;
  if (direction === 0 || Number.isNaN(direction)) return null;
  return direction > 0 === higherIsBetter;
}

/**
 * Days where the predictor is high (yes, or top third) and the target sits on the side the
 * correlation announces, the most striking first. Dates are those of the predictor day.
 */
export function pickExampleDates(
  sample: PairedSample,
  kind: ColumnKind,
  rho: number,
  dates: string[],
): string[] {
  const count = sample.predictor.length;
  const sortedTargets = [...sample.target].sort((left, right) => left - right);
  const median =
    count % 2 === 1
      ? sortedTargets[(count - 1) / 2]
      : (sortedTargets[count / 2 - 1] + sortedTargets[count / 2]) / 2;

  let predictorThreshold: number;
  if (kind === 'binary') {
    predictorThreshold = BINARY_HIGH;
  } else {
    const sortedPredictors = [...sample.predictor].sort((a, b) => a - b);
    predictorThreshold = sortedPredictors[count - Math.floor(count / 3)];
  }

  return sample.predictor
    .map((value, index) => ({
      index,
      value,
      distance:
        rho >= 0
          ? sample.target[index] - median
          : median - sample.target[index],
    }))
    .filter((entry) => entry.value >= predictorThreshold && entry.distance > 0)
    .sort(
      (left, right) =>
        right.distance - left.distance || left.index - right.index,
    )
    .slice(0, MAX_EXAMPLE_DATES)
    .map((entry) => dates[sample.days[entry.index]])
    .sort();
}
