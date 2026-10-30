import { jest } from '@jest/globals';
import { buildNoiseMatrix } from '../../domain/testing/synthetic-matrix.js';
import { computePatternReport } from '../../domain/pattern-engine.js';
import { PatternEngineRunner } from './pattern-engine.runner.js';
import type { PatternEngineJob } from './pattern-engine-job.js';

class MissingWorkerRunner extends PatternEngineRunner {
  protected override workerUrl(): URL {
    return new URL('file:///nonexistent/pattern-engine.worker.js');
  }
}

describe('PatternEngineRunner', () => {
  const job: PatternEngineJob = {
    matrix: buildNoiseMatrix({ seed: 4, eventPredictors: 2 }),
    targets: [{ fieldId: 'target', direction: 'NEUTRAL' }],
    options: {
      userId: 'u',
      computedAt: '2026-01-01T00:00:00.000Z',
      permutations: 50,
      changePointPermutations: 20,
    },
  };

  it('should fall back to an in-process computation when the worker cannot start', async () => {
    // Arrange
    const runner = new MissingWorkerRunner();
    const warn = jest
      .spyOn(
        (runner as unknown as { logger: { warn: (m: string) => void } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);

    // Act
    const report = await runner.run(job);

    // Assert
    expect(report).toEqual(
      computePatternReport(job.matrix, job.targets, job.options),
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
