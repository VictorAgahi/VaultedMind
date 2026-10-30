import type { ConstructKey } from '../../signals/domain/constructs.js';
import type {
  BeforeDifficultDaysItem,
  ColumnCategory,
  MatrixColumn,
} from './pattern-types.js';
import { fisherExactTwoSided } from './stats.js';
import {
  HIGH_LEVEL_THRESHOLD,
  LOW_LEVEL_THRESHOLD,
} from '../../signals/domain/signal-view.js';

export const DIFFICULT_DAY_SHARE = 0.2;
export const MIN_DAYS_WITH_TARGET = 30;
export const DAYS_BEFORE = 3;
export const MIN_OCCURRENCES_BEFORE = 4;
export const BEFORE_DIFFICULT_Q = 0.2;

/** A yes/no reading of a column, with the day-by-day answer (null when unknown). */
export interface BinaryItem {
  key: string;
  label: string;
  category: ColumnCategory;
  construct: ConstructKey;
  present: (boolean | null)[];
}

/**
 * Binary columns as they are, theme and state scores turned into "notable level"
 * (level 3 and above, or 1 and below for scores where the low end is the notable one).
 */
export function binaryItemsOf(columns: MatrixColumn[]): BinaryItem[] {
  const items: BinaryItem[] = [];
  for (const column of columns) {
    if (column.kind === 'binary') {
      items.push({
        key: column.key,
        label: column.label,
        category: column.category,
        construct: column.construct,
        present: column.values.map((value) =>
          value === null ? null : value >= 0.5,
        ),
      });
    } else if (column.category === 'theme' || column.category === 'state') {
      const lowEnd = column.notableEnd === 'low';
      items.push({
        key: `${column.key}:notable`,
        label: `${column.label} (niveau ${lowEnd ? 'faible' : 'fort'})`,
        category: column.category,
        construct: column.construct,
        present: column.values.map((value) => {
          if (value === null) return null;
          return lowEnd
            ? value <= LOW_LEVEL_THRESHOLD
            : value >= HIGH_LEVEL_THRESHOLD;
        }),
      });
    }
  }
  return items;
}

/**
 * Days with the unfavourable value of a yes/no target: absent when presence is the good side,
 * present otherwise. Null with too few observed days.
 */
export function findUnfavourableValueDays(
  target: Float64Array,
  higherIsBetter: boolean,
): boolean[] | null {
  const observed = Array.from(target).filter((value) => !Number.isNaN(value));
  if (observed.length < MIN_DAYS_WITH_TARGET) return null;
  const unfavourable = higherIsBetter ? 0 : 1;
  return Array.from(target).map((value) => value === unfavourable);
}

/** Days in the worst 20% of the target given its direction, or null with too few values. */
export function findDifficultDays(
  target: Float64Array,
  higherIsBetter: boolean,
): boolean[] | null {
  const observed = Array.from(target).filter((value) => !Number.isNaN(value));
  if (observed.length < MIN_DAYS_WITH_TARGET) return null;
  const sorted = [...observed].sort((left, right) => left - right);
  const cut = Math.floor(DIFFICULT_DAY_SHARE * (sorted.length - 1));
  const threshold = higherIsBetter
    ? sorted[cut]
    : sorted[sorted.length - 1 - cut];
  return Array.from(target).map((value) => {
    if (Number.isNaN(value)) return false;
    return higherIsBetter ? value <= threshold : value >= threshold;
  });
}

/**
 * Compares how often each item shows up in the 3 days before difficult days with how often it
 * shows up on the other days (difficult days themselves are left out of both groups).
 * Returns every tested item with its Fisher p-value; the caller applies the multiple testing
 * correction and the reporting thresholds.
 */
export function compareBeforeDifficultDays(
  difficult: boolean[],
  items: BinaryItem[],
): BeforeDifficultDaysItem[] {
  const length = difficult.length;
  const isBefore = new Array<boolean>(length).fill(false);
  difficult.forEach((isDifficult, day) => {
    if (!isDifficult) return;
    for (let back = 1; back <= DAYS_BEFORE; back++) {
      if (day - back >= 0) isBefore[day - back] = true;
    }
  });

  const results: BeforeDifficultDaysItem[] = [];
  for (const item of items) {
    let countBefore = 0;
    let daysBefore = 0;
    let countOther = 0;
    let daysOther = 0;
    for (let day = 0; day < length; day++) {
      const present = item.present[day];
      if (present === null) continue;
      if (isBefore[day]) {
        daysBefore++;
        if (present) countBefore++;
      } else if (!difficult[day]) {
        daysOther++;
        if (present) countOther++;
      }
    }
    if (daysBefore === 0 || daysOther === 0) continue;
    const frequencyBefore = countBefore / daysBefore;
    const frequencyOther = countOther / daysOther;
    results.push({
      key: item.key,
      label: item.label,
      category: item.category,
      countBefore,
      daysBefore,
      countOther,
      daysOther,
      frequencyBefore,
      frequencyOther,
      lift: frequencyOther > 0 ? frequencyBefore / frequencyOther : null,
      p: fisherExactTwoSided(
        countBefore,
        daysBefore - countBefore,
        countOther,
        daysOther - countOther,
      ),
      q: 1,
    });
  }
  return results;
}
