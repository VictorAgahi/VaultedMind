import { buildFinding, buildReport, buildTarget } from './pattern-fixtures.js';
import {
  canUseEngineBrief,
  renderPatternBrief,
  renderSolidFindingsForChat,
} from './pattern-brief.js';

const NOW = new Date('2026-10-30T10:00:00.000Z');

describe('canUseEngineBrief (Agent 2 skip decision)', () => {
  it('should skip the LLM agent for a fresh ok report with insights v2', () => {
    expect(canUseEngineBrief(buildReport(), true, NOW)).toBe(true);
  });

  it('should keep the LLM agent when insights v2 is disabled', () => {
    expect(canUseEngineBrief(buildReport(), false, NOW)).toBe(false);
  });

  it('should keep the LLM agent without a report', () => {
    expect(canUseEngineBrief(null, true, NOW)).toBe(false);
  });

  it.each(['insufficient_data', 'no_targets'] as const)(
    'should keep the LLM agent for status %s',
    (status) => {
      expect(canUseEngineBrief(buildReport({ status }), true, NOW)).toBe(false);
    },
  );

  it('should keep the LLM agent when the report is older than 3 days', () => {
    // Arrange
    const report = buildReport({ computedAt: '2026-10-26T10:00:00.000Z' });

    // Act / Assert
    expect(canUseEngineBrief(report, true, NOW)).toBe(false);
  });

  it('should accept a report computed exactly 3 days ago', () => {
    const report = buildReport({ computedAt: '2026-10-27T10:00:00.000Z' });
    expect(canUseEngineBrief(report, true, NOW)).toBe(true);
  });
});

describe('renderPatternBrief', () => {
  it('should list findings with strength, lag, n and effect', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [
            buildFinding(),
            buildFinding({ lag: 1, strength: 'piste', label: 'Café', n: 41 }),
          ],
        }),
      ],
    });

    // Act
    const brief = renderPatternBrief(report);

    // Assert
    expect(brief).toContain('force: solide');
    expect(brief).toContain('force: piste');
    expect(brief).toContain('décalage: le lendemain');
    expect(brief).toContain('Comparé sur 41 jours');
    expect(brief).toContain('+1,3 point');
    expect(brief).toContain('Avant les journées difficiles');
    expect(brief).toContain('Depuis le 1er mars 2026');
  });

  it('should never contain forbidden words', () => {
    // Arrange / Act
    const brief = renderPatternBrief(buildReport()).toLowerCase();

    // Assert
    for (const word of ['devrais', 'risque', 'dépression', 'à cause']) {
      expect(brief).not.toContain(word);
    }
  });

  it('should be deterministic', () => {
    expect(renderPatternBrief(buildReport())).toBe(
      renderPatternBrief(buildReport()),
    );
  });
});

describe('renderSolidFindingsForChat', () => {
  it('should keep only solid findings, at most 8 lines', () => {
    // Arrange
    const findings = [
      ...Array.from({ length: 10 }, (_, index) =>
        buildFinding({ label: `Solide ${index}` }),
      ),
      buildFinding({ label: 'Hypothèse', strength: 'piste' }),
    ];
    const report = buildReport({ targets: [buildTarget({ findings })] });

    // Act
    const text = renderSolidFindingsForChat(report);

    // Assert
    expect(text?.split('\n')).toHaveLength(8);
    expect(text).not.toContain('Hypothèse');
  });

  it('should return null without solid findings', () => {
    const report = buildReport({
      targets: [
        buildTarget({ findings: [buildFinding({ strength: 'piste' })] }),
      ],
    });
    expect(renderSolidFindingsForChat(report)).toBeNull();
  });
});

describe('renderPatternBrief levers and companions', () => {
  it('should present only actionable findings as levers and the rest as companions', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [
            buildFinding({
              key: 'physical_activity',
              label: 'Sport',
              category: 'event',
            }),
            buildFinding({
              key: 'low_mood',
              label: 'Humeur basse',
              category: 'state',
            }),
          ],
        }),
      ],
    });

    // Act
    const brief = renderPatternBrief(report);
    const [levers, companions] = brief.split('Ce qui va avec');

    // Assert
    expect(levers).toContain('« Sport »');
    expect(levers).not.toContain('Humeur basse');
    expect(companions).toContain('Humeur basse');
  });

  it('should leave the companions out of the chat context', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [
            buildFinding({
              key: 'low_mood',
              label: 'Humeur basse',
              category: 'state',
            }),
          ],
        }),
      ],
    });

    // Act
    const lines = renderSolidFindingsForChat(report);

    // Assert
    expect(lines).toBeNull();
  });
});
