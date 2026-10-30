import { jest } from '@jest/globals';
import type { JevClient } from '../../../signals/infrastructure/clients/jev.client.js';
import {
  buildFindingKey,
  describeLink,
} from '../../domain/pattern-obviousness.js';
import {
  buildFinding,
  buildReport,
  buildTarget,
} from '../../domain/pattern-fixtures.js';
import { ObviousnessService } from './obviousness.service.js';

describe('ObviousnessService', () => {
  let analyze: jest.Mock<JevClient['analyze']>;
  let configured: boolean;
  let service: ObviousnessService;

  const scoreAnswer = (score: number, confidence: number) => ({
    model: 'm',
    answers: { obviousness: { type: 'score' as const, score, confidence } },
  });

  beforeEach(() => {
    analyze = jest.fn<JevClient['analyze']>();
    configured = true;
    service = new ObviousnessService({
      analyze,
      isConfigured: () => configured,
    } as unknown as JevClient);
  });

  it('should ask one question per finding with the statement as state', async () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [buildFinding({ key: 'a' }), buildFinding({ key: 'b' })],
        }),
      ],
    });
    analyze.mockResolvedValue(scoreAnswer(2.9, 0.9));

    // Act
    const annotated = await service.annotate(report, null);

    // Assert
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(analyze.mock.calls[0][0]).toBe(
      describeLink(report.targets[0].findings[0], report.targets[0]),
    );
    expect(analyze.mock.calls[0][1]['obviousness']).toMatchObject({
      type: 'score',
      criteria: [
        'Surprenant',
        'Plausible mais pas évident',
        'Attendu',
        'Évident pour tout le monde',
      ],
    });
    expect(annotated.targets[0].findings.map((f) => f.obviousness)).toEqual([
      { level: 2.9, confidence: 0.9 },
      { level: 2.9, confidence: 0.9 },
    ]);
  });

  it('should reuse the previous score for the same finding key and only ask for new ones', async () => {
    // Arrange
    const known = buildFinding({
      key: 'a',
      obviousness: { level: 3, confidence: 0.95 },
    });
    const previous = buildReport({
      targets: [buildTarget({ findings: [known] })],
    });
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [
            buildFinding({ key: 'a' }),
            buildFinding({ key: 'new' }),
            buildFinding({ key: 'a', rho: -0.4 }),
          ],
        }),
      ],
    });
    analyze.mockResolvedValue(scoreAnswer(0.4, 0.8));

    // Act
    const annotated = await service.annotate(report, previous);

    // Assert
    expect(analyze).toHaveBeenCalledTimes(2);
    const findings = annotated.targets[0].findings;
    expect(findings[0].obviousness).toEqual(known.obviousness);
    expect(findings[1].obviousness).toEqual({ level: 0.4, confidence: 0.8 });
    expect(buildFindingKey('field:field-1', findings[2])).not.toBe(
      buildFindingKey('field:field-1', findings[0]),
    );
    expect(findings[2].obviousness).toEqual({ level: 0.4, confidence: 0.8 });
  });

  it('should leave findings unscored when Jev is not configured', async () => {
    // Arrange
    configured = false;

    // Act
    const annotated = await service.annotate(buildReport(), null);

    // Assert
    expect(analyze).not.toHaveBeenCalled();
    expect(annotated.targets[0].findings[0].obviousness).toBeNull();
  });

  it('should never fail the report when Jev fails', async () => {
    // Arrange
    analyze.mockRejectedValue(new Error('down'));

    // Act
    const annotated = await service.annotate(buildReport(), null);

    // Assert
    expect(annotated.status).toBe('ok');
    expect(annotated.targets[0].findings[0].obviousness).toBeNull();
  });

  it('should not mutate the report it was given', async () => {
    const report = buildReport();
    analyze.mockResolvedValue(scoreAnswer(3, 1));
    await service.annotate(report, null);
    expect(report.targets[0].findings[0].obviousness).toBeUndefined();
  });
});
