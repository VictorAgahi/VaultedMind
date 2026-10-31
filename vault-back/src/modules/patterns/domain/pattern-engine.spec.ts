import { findChangePoint } from './change-points.js';
import { computePatternReport } from './pattern-engine.js';
import type { InsightTarget } from './insight-target.js';
import type { PatternFinding, PatternReport } from './pattern-types.js';
import { mulberry32 } from './prng.js';
import { encodeSeries } from './series.js';
import {
  SYNTHETIC_TARGET_KEY,
  autoregressive,
  buildNoiseMatrix,
  column,
  fullyLoggedMatrix,
} from './testing/synthetic-matrix.js';

const targets: InsightTarget[] = [
  { fieldId: 'target', direction: 'HIGHER_IS_BETTER' },
];

const run = (
  matrix: ReturnType<typeof buildNoiseMatrix>,
  permutations: number,
): PatternReport =>
  computePatternReport(matrix, targets, {
    userId: 'user-1',
    computedAt: '2026-01-01T00:00:00.000Z',
    permutations,
    changePointPermutations: 200,
  });

const findingsOf = (report: PatternReport): PatternFinding[] =>
  report.targets[0].findings;

describe('computePatternReport', () => {
  describe('recall', () => {
    it('should find a next-day effect of 1.5 SD as solide at lag 1', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 21,
        eventPredictors: 8,
        continuousPredictors: 6,
        effect: { predictorKey: 'workout', lag: 1, size: 1.5 },
      });

      // Act
      const report = run(matrix, 2000);

      // Assert
      const finding = findingsOf(report).find(
        (item) => item.key === 'workout' && item.lag === 1,
      );
      expect(finding?.strength).toBe('solide');
      expect(finding?.partial).toBe(true);
      expect(finding?.favourable).toBe(true);
      expect(finding?.effect?.difference).toBeGreaterThan(0.5);
      expect(finding?.exampleDates.length).toBeGreaterThan(0);
    });

    it('should store the standard deviation of the target', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 5,
        eventPredictors: 2,
        continuousPredictors: 2,
      });

      // Act
      const report = run(matrix, 200);

      // Assert
      expect(report.targets[0].targetSd).toBeGreaterThan(0);
    });

    it('should find a same-day effect as solide at lag 0', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 22,
        eventPredictors: 8,
        continuousPredictors: 6,
        effect: { predictorKey: 'workout', lag: 0, size: 1.5 },
      });

      // Act
      const report = run(matrix, 2000);

      // Assert
      const finding = findingsOf(report).find(
        (item) => item.key === 'workout' && item.lag === 0,
      );
      expect(finding?.strength).toBe('solide');
      expect(finding?.partial).toBe(false);
    });

    it('should mark a harmful predictor as not favourable', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 23,
        eventPredictors: 4,
        effect: { predictorKey: 'conflict', lag: 1, size: -1.5 },
      });

      // Act
      const report = run(matrix, 1000);

      // Assert
      const finding = findingsOf(report).find(
        (item) => item.key === 'conflict',
      );
      expect(finding?.favourable).toBe(false);
    });

    it('should be reproducible', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 21,
        eventPredictors: 3,
        effect: { predictorKey: 'workout', lag: 1, size: 1.5 },
      });

      // Act
      const first = run(matrix, 300);
      const second = run(matrix, 300);

      // Assert
      expect(second).toEqual(first);
    });
  });

  describe('false positives', () => {
    it('should report at most one solide finding over 10 pure-noise users with 40 predictors', () => {
      // Arrange
      const seeds = Array.from({ length: 10 }, (_, index) => 100 + index);

      // Act
      const solideCounts = seeds.map((seed) => {
        const matrix = buildNoiseMatrix({
          seed,
          eventPredictors: 20,
          continuousPredictors: 20,
        });
        return findingsOf(run(matrix, 1000)).filter(
          (finding) => finding.strength === 'solide',
        ).length;
      });

      // Assert
      expect(
        solideCounts.reduce((sum, count) => sum + count, 0),
      ).toBeLessThanOrEqual(1);
    });

    it('should not call an independent AR(1) predictor solide for an AR(1) target', () => {
      // Arrange
      const seeds = [1, 2, 3, 4, 5, 6];

      // Act
      const solideCounts = seeds.map((seed) => {
        const matrix = buildNoiseMatrix({
          seed: 300 + seed,
          persistence: 0.85,
          continuousPredictors: 15,
        });
        return findingsOf(run(matrix, 1000)).filter(
          (finding) => finding.strength === 'solide',
        ).length;
      });

      // Assert
      expect(solideCounts.reduce((sum, count) => sum + count, 0)).toBe(0);
    });
  });

  describe('gating', () => {
    it('should report insufficient data under 30 logged days', () => {
      // Arrange
      const matrix = buildNoiseMatrix({
        seed: 1,
        days: 25,
        eventPredictors: 2,
      });

      // Act
      const report = run(matrix, 100);

      // Assert
      expect(report.status).toBe('insufficient_data');
      expect(report.daysLogged).toBe(25);
      expect(report.targets).toEqual([]);
    });

    it('should report no targets when none matches a column', () => {
      // Arrange
      const matrix = buildNoiseMatrix({ seed: 1, eventPredictors: 2 });

      // Act
      const report = computePatternReport(
        matrix,
        [{ fieldId: 'unknown', direction: 'LOWER_IS_BETTER' }],
        { userId: 'user-1', computedAt: 'now', permutations: 100 },
      );

      // Assert
      expect(report.status).toBe('no_targets');
    });

    it('should test no_log_previous_day and never use state at lag 0', () => {
      // Arrange
      const random = mulberry32(8);
      const days = 100;
      const logged = Array.from({ length: days }, (_, day) =>
        day % 5 === 3 ? 0 : 1,
      );
      const noisy = autoregressive(random, days, 0.2);
      const target = noisy.map((value, day) =>
        logged[day] === 0
          ? null
          : value - (day > 0 && logged[day - 1] === 0 ? 2 : 0),
      );
      const masked = (values: number[]): (number | null)[] =>
        values.map((value, day) => (logged[day] === 1 ? value : null));
      const matrix = {
        ...fullyLoggedMatrix([
          column(SYNTHETIC_TARGET_KEY, 'field', 'continuous', target),
          column(
            'mood_state',
            'state',
            'continuous',
            masked(autoregressive(random, days, 0.2)),
          ),
        ]),
        logged,
      };

      // Act
      const report = run(matrix, 1000);

      // Assert
      const keysAtLagZero = findingsOf(report)
        .filter((finding) => finding.lag === 0)
        .map((finding) => finding.key);
      expect(keysAtLagZero).not.toContain('mood_state');
      expect(
        findingsOf(report).find(
          (finding) => finding.key === 'no_log_previous_day',
        ),
      ).toMatchObject({ lag: 1, partial: false, favourable: false });
    });
  });
});

describe('findChangePoint', () => {
  const dates = Array.from({ length: 90 }, (_, day) => `d${day}`);

  const shifted = (seed: number, shift: number): Float64Array => {
    const noise = autoregressive(mulberry32(seed), 90, 0.3);
    return encodeSeries(
      noise.map((value, day) => (day >= 50 ? value + shift : value)),
    ).values;
  };

  it('should find an injected mean shift close to the right date', () => {
    // Arrange
    const series = shifted(5, 1.5);

    // Act
    const finding = findChangePoint({
      key: 'k',
      label: 'k',
      series,
      dates,
      seed: 1,
      permutations: 1000,
    });

    // Assert
    expect(finding).not.toBeNull();
    const day = Number(finding?.date.slice(1));
    expect(Math.abs(day - 50)).toBeLessThanOrEqual(6);
    expect(finding?.meanAfter).toBeGreaterThan(finding?.meanBefore ?? 0);
  });

  it('should find no change point in stationary noise', () => {
    // Arrange
    const series = shifted(6, 0);

    // Act
    const finding = findChangePoint({
      key: 'k',
      label: 'k',
      series,
      dates,
      seed: 1,
      permutations: 1000,
    });

    // Assert
    expect(finding).toBeNull();
  });

  it('should keep the false positive rate near the 5% level on stationary series', () => {
    // Arrange
    const seeds = Array.from({ length: 40 }, (_, index) => 1000 + index);

    // Act
    const found = seeds.filter(
      (seed) =>
        findChangePoint({
          key: 'k',
          label: 'k',
          series: shifted(seed, 0),
          dates,
          seed: 1,
          permutations: 300,
        }) !== null,
    );

    // Assert
    expect(found.length / seeds.length).toBeLessThanOrEqual(0.15);
  });
});
