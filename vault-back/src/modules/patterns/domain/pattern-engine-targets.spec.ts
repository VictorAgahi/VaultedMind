import { computePatternReport } from './pattern-engine.js';
import type { InsightTarget } from './insight-target.js';
import type { DailyMatrix, PatternReport } from './pattern-types.js';
import { mulberry32 } from './prng.js';
import { valueColumnKey } from './daily-matrix.js';
import {
  SYNTHETIC_TARGET_KEY,
  autoregressive,
  bernoulli,
  buildNoiseMatrix,
  column,
  fullyLoggedMatrix,
} from './testing/synthetic-matrix.js';

const options = {
  userId: 'user-1',
  computedAt: '2026-01-01T00:00:00.000Z',
  permutations: 1000,
  changePointPermutations: 100,
};

const scaleTarget = (
  direction: InsightTarget['direction'] = 'HIGHER_IS_BETTER',
): InsightTarget => ({ fieldId: 'target', direction });

describe('construct exclusion', () => {
  const build = (
    predictorConstruct: 'fatigue' | 'sleep',
    flavour: 'strong' | 'noise' = 'strong',
  ): DailyMatrix => {
    const matrix = buildNoiseMatrix({
      seed: 21,
      eventPredictors: flavour === 'noise' ? 3 : 0,
      effect: { predictorKey: 'tired_state', lag: 0, size: 1.5 },
    });
    matrix.columns.find((c) => c.key === 'tired_state')!.construct =
      predictorConstruct;
    matrix.columns.find((c) => c.key === SYNTHETIC_TARGET_KEY)!.construct =
      'fatigue';
    return matrix;
  };

  it('should never test a predictor measuring the same construct as the target', () => {
    // Arrange
    const matrix = build('fatigue');

    // Act
    const report = computePatternReport(matrix, [scaleTarget()], options);

    // Assert
    const keys = report.targets[0].findings.map((finding) => finding.key);
    expect(keys).not.toContain('tired_state');
  });

  it('should find the same link when the constructs differ', () => {
    // Arrange
    const matrix = build('sleep');

    // Act
    const report = computePatternReport(matrix, [scaleTarget()], options);

    // Assert
    const keys = report.targets[0].findings.map((finding) => finding.key);
    expect(keys).toContain('tired_state');
  });

  it('should still test two columns of the construct "other"', () => {
    // Arrange
    const matrix = build('sleep');
    matrix.columns.forEach((c) => (c.construct = 'other'));

    // Act
    const report = computePatternReport(matrix, [scaleTarget()], options);

    // Assert
    expect(report.targets[0].findings.map((f) => f.key)).toContain(
      'tired_state',
    );
  });

  it('should leave same-construct items out of the before-difficult-days comparison', () => {
    // Arrange
    const matrix = build('sleep');
    const target = matrix.columns.find((c) => c.key === SYNTHETIC_TARGET_KEY)!;
    const event = matrix.columns.find((c) => c.key === 'tired_state')!;
    event.construct = 'fatigue';
    const sorted = [...(target.values as number[])].sort((a, b) => a - b);
    const worst = sorted[Math.floor(sorted.length * 0.2)];
    event.values = target.values.map((v) => ((v as number) <= worst ? 1 : 0));

    // Act
    const same = computePatternReport(matrix, [scaleTarget()], options);
    event.construct = 'sleep';
    const different = computePatternReport(matrix, [scaleTarget()], options);

    // Assert
    const itemKeys = (report: PatternReport): string[] =>
      report.targets[0].beforeDifficultDays?.items.map((i) => i.key) ?? [];
    expect(itemKeys(same)).not.toContain('tired_state');
    expect(itemKeys(different)).toContain('tired_state');
  });

  it('should skip the logging predictor for a target of the logging construct', () => {
    // Arrange
    const matrix = build('sleep');
    matrix.columns.find((c) => c.key === SYNTHETIC_TARGET_KEY)!.construct =
      'logging';

    // Act
    const report = computePatternReport(matrix, [scaleTarget()], options);

    // Assert
    expect(
      report.targets[0].findings.map((finding) => finding.key),
    ).not.toContain('no_log_previous_day');
  });
});

describe('value targets', () => {
  /** A yes/no target that is more frequent the day after a predictor event. */
  const buildValueMatrix = (days = 140): DailyMatrix => {
    const random = mulberry32(5);
    const event = bernoulli(random, days, 0.3);
    const target = event.map((_, day) => {
      const chance = day > 0 && event[day - 1] === 1 ? 0.65 : 0.12;
      return random() < chance ? 1 : 0;
    });
    const noise = autoregressive(random, days, 0.3);
    return fullyLoggedMatrix([
      {
        ...column(
          valueColumnKey('mood', 'agressif'),
          'field',
          'binary',
          target,
        ),
        label: 'Humeur : agressif',
        fieldId: 'mood',
        targetOnly: true,
      },
      column('conflict', 'event', 'binary', event),
      column('noise', 'field', 'continuous', noise),
    ]);
  };

  const valueTarget = (
    direction: InsightTarget['direction'],
  ): InsightTarget => ({ fieldId: 'mood', direction, value: 'agressif' });

  it('should report effects as frequencies and mark the target as binary', () => {
    // Arrange
    const matrix = buildValueMatrix();

    // Act
    const report = computePatternReport(
      matrix,
      [valueTarget('LOWER_IS_BETTER')],
      options,
    );

    // Assert
    const target = report.targets[0];
    expect(target).toMatchObject({
      fieldId: 'mood',
      value: 'agressif',
      binary: true,
      label: 'Humeur : agressif',
      direction: 'LOWER_IS_BETTER',
    });
    const finding = target.findings.find(
      (item) => item.key === 'conflict' && item.lag === 1,
    );
    expect(finding?.effect?.targetBinary).toBe(true);
    expect(finding?.effect?.meanWhenHigh).toBeGreaterThan(0.4);
    expect(finding?.effect?.meanWhenLow).toBeLessThan(0.3);
    expect(finding?.effect?.difference).toBeGreaterThan(0.2);
    // Presence is the bad side and the predictor makes it more frequent
    expect(finding?.favourable).toBe(false);
  });

  it('should take the days with the unfavourable value as difficult days', () => {
    // Arrange
    const matrix = buildValueMatrix();
    const presentDays = (matrix.columns[0].values as number[]).filter(
      (value) => value === 1,
    ).length;

    // Act
    const bad = computePatternReport(
      matrix,
      [valueTarget('LOWER_IS_BETTER')],
      options,
    );
    const good = computePatternReport(
      matrix,
      [valueTarget('HIGHER_IS_BETTER')],
      options,
    );

    // Assert
    expect(bad.targets[0].beforeDifficultDays?.difficultDayCount).toBe(
      presentDays,
    );
    expect(good.targets[0].beforeDifficultDays?.difficultDayCount).toBe(
      140 - presentDays,
    );
  });

  it('should never use a value column as a predictor, nor the field itself', () => {
    // Arrange
    const matrix = buildValueMatrix();
    matrix.columns.push({
      ...column('field:mood', 'field', 'continuous', matrix.columns[2].values),
      fieldId: 'mood',
    });

    // Act
    const report = computePatternReport(
      matrix,
      [valueTarget('NEUTRAL'), scaleTarget()],
      options,
    );

    // Assert
    const keys = report.targets[0].findings.map((finding) => finding.key);
    expect(keys).not.toContain('field:mood');
    expect(keys).not.toContain(valueColumnKey('mood', 'agressif'));
  });

  it('should leave out change points for a yes/no target', () => {
    const report = computePatternReport(
      buildValueMatrix(),
      [valueTarget('NEUTRAL')],
      options,
    );
    expect(report.targets[0].changePoints).toEqual([]);
  });
});

describe('neutral targets', () => {
  it('should have no favourable side, no difficult days and no score text gaps', () => {
    // Arrange
    const matrix = buildNoiseMatrix({
      seed: 21,
      eventPredictors: 3,
      effect: { predictorKey: 'workout', lag: 0, size: 1.5 },
    });
    matrix.columns.push(
      column(
        'overall_tone',
        'state',
        'continuous',
        autoregressive(mulberry32(3), 90, 0.3),
      ),
    );

    // Act
    const report = computePatternReport(
      matrix,
      [scaleTarget('NEUTRAL')],
      options,
    );

    // Assert
    const target = report.targets[0];
    expect(target.direction).toBe('NEUTRAL');
    expect(target.findings.length).toBeGreaterThan(0);
    expect(
      target.findings.every((finding) => finding.favourable === null),
    ).toBe(true);
    expect(target.beforeDifficultDays).toBeNull();
    expect(target.scoreTextGaps).toEqual([]);
  });
});

describe('multiple testing per target', () => {
  it('should give the same findings to a target whatever the other targets are', () => {
    // Arrange
    const matrix = buildNoiseMatrix({
      seed: 33,
      eventPredictors: 6,
      continuousPredictors: 4,
      effect: { predictorKey: 'workout', lag: 1, size: 1.2 },
    });
    const second = column(
      'field:second',
      'field',
      'continuous',
      autoregressive(mulberry32(77), 90, 0.4),
    );
    second.fieldId = 'second';
    matrix.columns.push(second);
    const alone = computePatternReport(matrix, [scaleTarget()], options);

    // Act
    const together = computePatternReport(
      matrix,
      [scaleTarget(), { fieldId: 'second', direction: 'LOWER_IS_BETTER' }],
      options,
    );

    // Assert
    expect(together.targets).toHaveLength(2);
    expect(together.targets[0].findings).toEqual(alone.targets[0].findings);
  });
});
