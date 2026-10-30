import { FieldType } from '../../health/domain/enums/field-type.enum.js';
import { buildDailyMatrix, valueColumnKey } from './daily-matrix.js';
import {
  renderPatternBrief,
  renderSolidFindingsForChat,
} from './pattern-brief.js';
import {
  buildBeforeItem,
  buildFinding,
  buildReport,
  buildTarget,
} from './pattern-fixtures.js';
import { buildFindingKey } from './pattern-obviousness.js';
import { buildPatternReportView } from './pattern-report-view.js';
import {
  summarizeBeforeDifficultItem,
  summarizeFinding,
} from './pattern-summaries.js';
import type { PatternFinding, PatternReport } from './pattern-types.js';

const FORBIDDEN_WORDS = [
  'devrais',
  'risque',
  'dépression',
  'à cause',
  'trouble',
  'symptôme',
];

function expectCalm(sentence: string): void {
  for (const word of FORBIDDEN_WORDS) {
    expect(sentence.toLowerCase()).not.toContain(word);
  }
}

const binaryEffect = (high: number, low: number): PatternFinding['effect'] => ({
  kind: 'binary',
  targetBinary: true,
  meanWhenHigh: high,
  meanWhenLow: low,
  countHigh: 20,
  countLow: 50,
  difference: high - low,
});

describe('value columns of the daily matrix', () => {
  const fields = [
    { id: 'u', name: 'Humeur', fieldType: FieldType.STRING, isActive: true },
    {
      id: 'o',
      name: 'Énergie',
      fieldType: FieldType.STRING,
      isActive: true,
      optionsOrder: ['basse', 'haute'],
    },
  ];
  const day = (date: string, u?: string) => ({
    date,
    fieldValues: new Map(u === undefined ? [] : [['u', u]]),
    signals: null,
  });

  it('should be 1 on the value, 0 on another value, null when empty or unlogged', () => {
    // Arrange
    const logs = [
      day('2026-03-01', 'agressif'),
      day('2026-03-02', 'calme'),
      day('2026-03-03', '  '),
      day('2026-03-05', 'agressif'),
    ];

    // Act
    const matrix = buildDailyMatrix(
      logs,
      fields,
      [],
      [{ fieldId: 'u', value: 'agressif' }],
    );

    // Assert
    const target = matrix.columns.find(
      (c) => c.key === valueColumnKey('u', 'agressif'),
    );
    expect(target?.values).toEqual([1, 0, null, null, 1]);
    expect(target).toMatchObject({
      kind: 'binary',
      targetOnly: true,
      fieldId: 'u',
      label: 'Humeur : agressif',
    });
  });

  it('should not build the unordered field as a scale, and should allow several values of one field', () => {
    // Arrange
    const logs = [day('2026-03-01', 'agressif'), day('2026-03-02', 'calme')];

    // Act
    const matrix = buildDailyMatrix(
      logs,
      fields,
      [],
      [
        { fieldId: 'u', value: 'agressif' },
        { fieldId: 'u', value: 'calme' },
        { fieldId: 'u', value: 'calme' },
        { fieldId: 'missing', value: 'x' },
      ],
    );

    // Assert
    const keys = matrix.columns.map((c) => c.key);
    expect(keys).not.toContain('field:u');
    expect(keys).toContain(valueColumnKey('u', 'agressif'));
    expect(keys).toContain(valueColumnKey('u', 'calme'));
    expect(keys.filter((k) => k === valueColumnKey('u', 'calme'))).toHaveLength(
      1,
    );
    expect(keys).not.toContain(valueColumnKey('missing', 'x'));
  });

  it('should give field columns their effective construct', () => {
    // Arrange
    const matrix = buildDailyMatrix(
      [day('2026-03-01', 'a')],
      [
        {
          id: 'u',
          name: 'Humeur',
          fieldType: FieldType.STRING,
          isActive: true,
          optionsOrder: ['a'],
          construct: 'mood',
          constructOverride: 'anxiety',
        },
      ],
      [],
    );

    // Assert
    expect(matrix.columns[0].construct).toBe('anxiety');
  });
});

describe('sentences for value targets', () => {
  const finding = (over: Partial<PatternFinding> = {}): PatternFinding =>
    buildFinding({
      label: 'Tension',
      lag: 1,
      effect: binaryEffect(0.32, 0.12),
      ...over,
    });

  it('should tell the difference in frequency with the label of the target', () => {
    // Act
    const sentence = summarizeFinding(finding(), 'Humeur : agressif');

    // Assert
    expect(sentence).toBe(
      '« Humeur : agressif » est plus fréquent le lendemain des jours où « Tension » est présent (32 % des jours contre 12 %).',
    );
    expectCalm(sentence);
    expect(sentence).not.toMatch(/\b(tu|ton|ta|tes)\b/);
  });

  it('should use the rarer variant, the same-day variant and the continuous predictor', () => {
    expect(
      summarizeFinding(
        finding({ lag: 0, effect: binaryEffect(0.05, 0.3) }),
        'Humeur : agressif',
      ),
    ).toBe(
      '« Humeur : agressif » est plus rare les jours où « Tension » est présent (5 % des jours contre 30 %).',
    );
    expect(
      summarizeFinding(
        finding({
          effect: { ...binaryEffect(0.4, 0.1), kind: 'continuous' },
        }),
        'Humeur : agressif',
      ),
    ).toContain('le lendemain des jours où « Tension » est plus élevé');
  });

  it('should say nothing changes when the gap rounds to zero points', () => {
    expect(
      summarizeFinding(finding({ effect: binaryEffect(0.201, 0.2) }), 'T'),
    ).toContain('reste à peu près aussi fréquent');
  });

  it('should phrase the before-difficult days with the label for a value target', () => {
    // Arrange
    const item = buildBeforeItem();

    // Act
    const bad = summarizeBeforeDifficultItem(item, {
      binary: true,
      direction: 'LOWER_IS_BETTER',
      label: 'Humeur : agressif',
    });
    const good = summarizeBeforeDifficultItem(item, {
      binary: true,
      direction: 'HIGHER_IS_BETTER',
      label: 'Humeur : calme',
    });

    // Assert
    expect(bad).toContain('les jours où « Humeur : agressif » est présent');
    expect(good).toContain('les jours où « Humeur : calme » est absent');
    expect(bad).not.toContain('tes journées');
    expectCalm(bad);
  });
});

describe('report view', () => {
  it('should add the obviousness verdict and the finding key to every finding', () => {
    // Arrange
    const obvious = buildFinding({
      key: 'a',
      obviousness: { level: 3, confidence: 0.9 },
    });
    const plain = buildFinding({ key: 'b' });
    const report = buildReport({
      targets: [buildTarget({ findings: [obvious, plain] })],
    });
    const overrides = { [buildFindingKey('field:field-1', plain)]: true };

    // Act
    const view = buildPatternReportView(
      report,
      new Set(['field-1']),
      overrides,
    );

    // Assert
    const [first, second] = view.targets[0].findings;
    expect(first).toMatchObject({
      obvious: true,
      obviousSource: 'jev',
      findingKey: 'a|field:field-1|0|+',
    });
    expect(second).toMatchObject({ obvious: true, obviousSource: 'user' });
  });

  it('should tell value targets apart from the scale of the same field', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({ fieldId: 'f', key: 'field:f' }),
        buildTarget({
          fieldId: 'f',
          key: 'field:f=x',
          value: 'x',
          binary: true,
        }),
      ],
    });

    // Act
    const view = buildPatternReportView(report, new Set(['f=x']));

    // Assert
    expect(view.targets.map((t) => t.targetStillValid)).toEqual([false, true]);
  });

  it('should still render a report stored by the first engine version', () => {
    // Arrange
    const legacy = JSON.parse(JSON.stringify(buildReport())) as PatternReport;
    const target = legacy.targets[0] as unknown as Record<string, unknown>;
    delete target['value'];
    delete target['binary'];
    delete target['findings'];
    delete target['changePoints'];
    delete target['scoreTextGaps'];
    delete (legacy as unknown as Record<string, unknown>)['stateChangePoints'];

    // Act
    const view = buildPatternReportView(legacy, new Set(['field-1']));

    // Assert
    expect(view.targets[0].findings).toEqual([]);
    expect(view.targets[0].changePoints).toEqual([]);
    expect(view.stateChangePoints).toEqual([]);
    expect(view.targets[0].targetStillValid).toBe(true);
  });

  it('should read old findings as not obvious without source', () => {
    const view = buildPatternReportView(buildReport(), new Set(['field-1']));
    expect(view.targets[0].findings[0]).toMatchObject({
      obvious: false,
      obviousSource: null,
    });
  });
});

describe('briefs and obviousness', () => {
  const obvious = buildFinding({
    key: 'poor_sleep',
    label: 'Mauvaise nuit',
    obviousness: { level: 3, confidence: 0.9 },
  });
  const interesting = buildFinding({ key: 'alcohol', label: 'Alcool' });
  const report = buildReport({
    targets: [
      buildTarget({ label: 'Fatigue', findings: [obvious, interesting] }),
    ],
  });

  it('should keep obvious findings out of the main list and mention them in one line', () => {
    // Act
    const brief = renderPatternBrief(report);

    // Assert
    const lines = brief.split('\n');
    const mainLines = lines.filter(
      (line) => line.startsWith('- ') && line.includes('force:'),
    );
    expect(mainLines).toHaveLength(1);
    expect(mainLines[0]).toContain('Alcool');
    const expectedLines = lines.filter((line) =>
      line.startsWith('Liens attendus'),
    );
    expect(expectedLines).toEqual([
      'Liens attendus (à ne pas mettre en avant) : « Mauvaise nuit » et « Fatigue ».',
    ]);
  });

  it('should not mention any expected link in the chat lines', () => {
    // Act
    const text = renderSolidFindingsForChat(report);

    // Assert
    expect(text).toContain('Alcool');
    expect(text).not.toContain('Mauvaise nuit');
    expect(text).not.toContain('Liens attendus');
  });

  it('should honour the user overrides in both', () => {
    // Arrange
    const overrides = {
      [buildFindingKey('field:field-1', obvious)]: false,
      [buildFindingKey('field:field-1', interesting)]: true,
    };

    // Act
    const brief = renderPatternBrief(report, overrides);
    const chat = renderSolidFindingsForChat(report, 8, overrides);

    // Assert
    expect(brief).toContain('« Alcool » et « Fatigue »');
    expect(chat).toContain('Mauvaise nuit');
    expect(chat).not.toContain('Alcool');
  });

  it('should describe a neutral target without a good side', () => {
    // Arrange
    const neutral = buildReport({
      targets: [
        buildTarget({
          direction: 'NEUTRAL',
          findings: [buildFinding({ favourable: null })],
          beforeDifficultDays: null,
        }),
      ],
    });

    // Act
    const brief = renderPatternBrief(neutral);

    // Assert
    expect(brief).toContain('aucun sens souhaité');
    expect(brief).toContain('le fait monter');
    expect(brief).not.toContain('Avant les journées difficiles');
    expectCalm(brief);
  });
});
