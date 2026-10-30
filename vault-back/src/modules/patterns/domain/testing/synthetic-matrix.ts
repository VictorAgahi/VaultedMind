import { gaussian, mulberry32 } from '../prng.js';
import type {
  ColumnCategory,
  ColumnKind,
  DailyMatrix,
  MatrixColumn,
} from '../pattern-types.js';

export const SYNTHETIC_TARGET_KEY = 'field:target';

/** Stationary AR(1) series with unit variance. */
export function autoregressive(
  random: () => number,
  length: number,
  persistence: number,
): number[] {
  const innovationScale = Math.sqrt(1 - persistence * persistence);
  const values: number[] = [];
  let previous = gaussian(random);
  for (let index = 0; index < length; index++) {
    previous = persistence * previous + innovationScale * gaussian(random);
    values.push(previous);
  }
  return values;
}

export function bernoulli(
  random: () => number,
  length: number,
  probability: number,
): number[] {
  return Array.from({ length }, () => (random() < probability ? 1 : 0));
}

export function column(
  key: string,
  category: ColumnCategory,
  kind: ColumnKind,
  values: (number | null)[],
): MatrixColumn {
  return { key, label: key, category, kind, values };
}

/** A matrix where every day is logged. */
export function fullyLoggedMatrix(columns: MatrixColumn[]): DailyMatrix {
  const length = columns[0].values.length;
  const start = Date.UTC(2026, 0, 1);
  return {
    dates: Array.from({ length }, (_, day) =>
      new Date(start + day * 86_400_000).toISOString().slice(0, 10),
    ),
    logged: new Array<number>(length).fill(1),
    columns,
  };
}

export interface NoiseMatrixOptions {
  seed: number;
  days?: number;
  persistence?: number;
  eventPredictors?: number;
  continuousPredictors?: number;
  /** Added to the target on day d + lag when the event is present on day d. */
  effect?: { predictorKey: string; lag: 0 | 1; size: number };
}

/**
 * A target made of autocorrelated noise, a set of independent noise predictors and,
 * optionally, one injected event that moves the target by `size` standard deviations.
 */
export function buildNoiseMatrix(options: NoiseMatrixOptions): DailyMatrix {
  const random = mulberry32(options.seed);
  const days = options.days ?? 90;
  const persistence = options.persistence ?? 0.4;
  const target = autoregressive(random, days, persistence);

  const columns: MatrixColumn[] = [];
  const injected = options.effect;
  if (injected) {
    const event = bernoulli(random, days, 0.25);
    event.forEach((present, day) => {
      const affected = day + injected.lag;
      if (present === 1 && affected < days) target[affected] += injected.size;
    });
    columns.push(column(injected.predictorKey, 'event', 'binary', event));
  }
  for (let index = 0; index < (options.eventPredictors ?? 0); index++) {
    columns.push(
      column(`event_${index}`, 'event', 'binary', bernoulli(random, days, 0.3)),
    );
  }
  for (let index = 0; index < (options.continuousPredictors ?? 0); index++) {
    columns.push(
      column(
        `scale_${index}`,
        'field',
        'continuous',
        autoregressive(random, days, persistence),
      ),
    );
  }
  columns.unshift(column(SYNTHETIC_TARGET_KEY, 'field', 'continuous', target));
  return fullyLoggedMatrix(columns);
}
