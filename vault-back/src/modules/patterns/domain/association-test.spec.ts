import {
  RankCorrelator,
  blockPermutationPValue,
  collectPairs,
  observedStatistic,
  skipReason,
} from './association-test.js';
import { mulberry32 } from './prng.js';
import { encodeSeries } from './series.js';

function noisyWithGaps(seed: number, length: number): (number | null)[] {
  const random = mulberry32(seed);
  return Array.from({ length }, () =>
    random() < 0.1 ? null : Math.floor(random() * 6),
  );
}

describe('RankCorrelator', () => {
  it.each([
    { lag: 0 as const, partial: false },
    { lag: 1 as const, partial: false },
    { lag: 1 as const, partial: true },
  ])(
    'should equal the reference statistic (lag $lag, partial $partial)',
    ({ lag, partial }) => {
      // Arrange
      const predictor = encodeSeries(noisyWithGaps(1, 90));
      const target = encodeSeries(noisyWithGaps(2, 90));
      const sample = collectPairs(
        predictor.values,
        target.values,
        lag,
        partial,
      );
      const correlator = new RankCorrelator(90);

      // Act
      const fast = correlator.statistic(predictor.codes, target, lag, partial);
      const reference = observedStatistic(sample, partial);

      // Assert
      expect(fast).toBeCloseTo(reference, 10);
    },
  );
});

describe('skipReason', () => {
  const sampleOf = (predictor: number[]) => ({
    predictor,
    target: predictor.map((_, index) => index),
    control: [],
    days: predictor.map((_, index) => index),
  });

  it('should skip samples with fewer than 20 pairs', () => {
    expect(skipReason(sampleOf([1, 2, 3, 4]), 'continuous')).toBe(
      'too_few_pairs',
    );
  });

  it('should skip a constant predictor', () => {
    expect(
      skipReason(sampleOf(new Array<number>(30).fill(1)), 'continuous'),
    ).toBe('constant_predictor');
  });

  it('should skip a binary predictor with fewer than 8 days on one side', () => {
    const values = [
      ...new Array<number>(25).fill(0),
      ...new Array<number>(5).fill(1),
    ];
    expect(skipReason(sampleOf(values), 'binary')).toBe('unbalanced_binary');
    expect(skipReason(sampleOf(values), 'continuous')).toBeNull();
  });
});

describe('blockPermutationPValue', () => {
  it('should be deterministic and detect a strong link', () => {
    // Arrange
    const random = mulberry32(5);
    const values = Array.from({ length: 80 }, () => random());
    const predictor = encodeSeries(values);
    const target = encodeSeries(
      values.map((value) => value * 2 + random() * 0.2),
    );
    const correlator = new RankCorrelator(80);
    const input = {
      predictor,
      target,
      lag: 0 as const,
      partial: false,
      observed: observedStatistic(
        collectPairs(predictor.values, target.values, 0, false),
        false,
      ),
      seed: 99,
      permutations: 300,
      correlator,
    };

    // Act
    const first = blockPermutationPValue(input);
    const second = blockPermutationPValue(input);

    // Assert
    expect(first).toBe(second);
    expect(first).toBeCloseTo(1 / 301, 10);
  });
});
