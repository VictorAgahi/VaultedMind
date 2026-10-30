import type { ScoreTextGap } from './pattern-types.js';
import { averageRanks } from './stats.js';

export const SCORE_TEXT_GAP = 0.6;
export const MAX_SCORE_TEXT_GAPS = 10;

/** Percentile rank in [0, 1] of each present value among the present values, NaN when missing. */
function percentiles(series: Float64Array): Float64Array {
  const days: number[] = [];
  series.forEach((value, day) => {
    if (!Number.isNaN(value)) days.push(day);
  });
  const result = new Float64Array(series.length).fill(NaN);
  if (days.length < 2) return result;
  const ranks = averageRanks(days.map((day) => series[day]));
  days.forEach((day, position) => {
    result[day] = (ranks[position] - 1) / (days.length - 1);
  });
  return result;
}

/**
 * Days where the target and the overall tone of the note disagree: both are put on a
 * "better is higher" percentile scale and compared. Largest gaps first.
 */
export function findScoreTextGaps(
  target: Float64Array,
  tone: Float64Array,
  higherIsBetter: boolean,
  dates: string[],
): ScoreTextGap[] {
  const targetPercentiles = percentiles(target);
  const tonePercentiles = percentiles(tone);
  const gaps: (ScoreTextGap & { gap: number })[] = [];
  for (let day = 0; day < target.length; day++) {
    if (Number.isNaN(targetPercentiles[day])) continue;
    if (Number.isNaN(tonePercentiles[day])) continue;
    const targetPercentile = higherIsBetter
      ? targetPercentiles[day]
      : 1 - targetPercentiles[day];
    const gap = Math.abs(targetPercentile - tonePercentiles[day]);
    if (gap < SCORE_TEXT_GAP - 1e-9) continue;
    gaps.push({
      date: dates[day],
      targetValue: target[day],
      toneValue: tone[day],
      targetPercentile,
      tonePercentile: tonePercentiles[day],
      gap,
    });
  }
  return gaps
    .sort(
      (left, right) =>
        right.gap - left.gap || left.date.localeCompare(right.date),
    )
    .slice(0, MAX_SCORE_TEXT_GAPS)
    .map(
      (entry): ScoreTextGap => ({
        date: entry.date,
        targetValue: entry.targetValue,
        toneValue: entry.toneValue,
        targetPercentile: entry.targetPercentile,
        tonePercentile: entry.tonePercentile,
      }),
    );
}
