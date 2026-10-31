import { AppleWatchMetric } from '../../health/domain/enums/apple-watch-metric.enum.js';
import type { TrackedSubject } from '../../signals/domain/tracked-subject.js';
import { buildDailyMatrix } from './daily-matrix.js';
import { signalContext } from '../../signals/domain/signal-context.js';
import {
  buildBeforeItem,
  buildFinding,
  buildReport,
  buildTarget,
} from './pattern-fixtures.js';
import { buildPatternReportView } from './pattern-report-view.js';
import {
  isActionablePredictor,
  isNegligibleEffect,
  languageMarkerLabel,
  readableLabel,
  sourceOfCategory,
} from './pattern-sources.js';
import {
  summarizeBeforeDifficultItem,
  summarizeFinding,
} from './pattern-summaries.js';
import type {
  ColumnCategory,
  PatternEffect,
  PatternFinding,
} from './pattern-types.js';

const FORBIDDEN = /devrais|risque|dépression|à cause/i;
const SECOND_PERSON = /\b(tu|ton|tes|ta|te|t')\b/i;
const RAW_KEY = /word_count|absolutist_ratio|first_person_ratio/;
const mochi: TrackedSubject = {
  kind: 'ANIMAL',
  name: 'Mochi',
  species: 'chat',
};

const continuousEffect: PatternEffect = {
  kind: 'continuous',
  meanWhenHigh: 4,
  meanWhenLow: 6,
  countHigh: 20,
  countLow: 20,
  difference: -2,
};

function finding(over: Partial<PatternFinding>): PatternFinding {
  return buildFinding(over);
}

describe('source of a finding', () => {
  it.each<[ColumnCategory, string]>([
    ['field', 'field'],
    ['body', 'health'],
    ['event', 'notes'],
    ['theme', 'notes'],
    ['state', 'notes'],
    ['person', 'notes'],
    ['custom', 'notes'],
    ['language', 'language'],
    ['logging', 'logging'],
  ])('should map the category %s to the source %s', (category, source) => {
    // Act
    const result = sourceOfCategory(category);

    // Assert
    expect(result).toBe(source);
  });

  it('should add the source of every finding to the report view at read time', () => {
    // Arrange
    const categories: ColumnCategory[] = [
      'field',
      'body',
      'theme',
      'language',
      'logging',
    ];
    const report = buildReport({
      targets: [
        buildTarget({
          findings: categories.map((category) =>
            finding({ key: `k_${category}`, category }),
          ),
        }),
      ],
    });

    // Act
    const view = buildPatternReportView(report, new Set());

    // Assert
    expect(view.targets[0].findings.map((item) => item.source)).toEqual([
      'field',
      'health',
      'notes',
      'language',
      'logging',
    ]);
  });
});

describe('labels of the language markers', () => {
  it('should give a human label to each marker', () => {
    // Assert
    expect(languageMarkerLabel('word_count')).toBe('Longueur de ta note');
    expect(languageMarkerLabel('word_count', mochi)).toBe(
      'Longueur de la note',
    );
    expect(languageMarkerLabel('absolutist_ratio')).toBe(
      'Mots absolus (toujours, jamais, rien...)',
    );
    expect(languageMarkerLabel('first_person_ratio')).toBe('Usage de « je »');
    expect(languageMarkerLabel('rumination')).toBeNull();
    expect(readableLabel('rumination', 'Rumination')).toBe('Rumination');
  });

  it('should label the matrix columns without leaking a raw key', () => {
    // Arrange
    const logs = [
      {
        date: '2026-03-01',
        fieldValues: new Map<string, string>(),
        signals: {
          views: [],
          markers: {
            wordCount: 50,
            absolutistRatio: 0.02,
            firstPersonRatio: 0.1,
          },
        },
      },
    ];

    // Act
    const matrix = buildDailyMatrix(logs, [], signalContext({}));

    // Assert
    const labels = matrix.columns
      .filter((column) => column.category === 'language')
      .map((column) => column.label);
    expect(labels).toEqual([
      'Longueur de ta note',
      'Mots absolus (toujours, jamais, rien...)',
      'Usage de « je »',
    ]);
  });

  it('should relabel stored language findings in sentences and views', () => {
    // Arrange
    const stored = finding({
      key: 'absolutist_ratio',
      label: 'Mots absolus',
      category: 'language',
      effect: continuousEffect,
    });
    const report = buildReport({
      targets: [buildTarget({ findings: [stored] })],
    });

    // Act
    const view = buildPatternReportView(report, new Set());
    const item = view.targets[0].findings[0];

    // Assert
    expect(item.label).toBe('Mots absolus (toujours, jamais, rien...)');
    expect(item.summary).toContain(
      '« Mots absolus (toujours, jamais, rien...) »',
    );
    expect(item.summary).not.toMatch(RAW_KEY);
  });
});

describe('sentences by source', () => {
  it('should state the top versus bottom third for a continuous predictor', () => {
    // Act
    const sentence = summarizeFinding(
      finding({
        key: 'sleep',
        label: 'Sommeil',
        category: 'body',
        effect: continuousEffect,
      }),
      'Humeur',
    );

    // Assert
    expect(sentence).toBe(
      'Les jours où la valeur de « Sommeil » est parmi les plus hautes (le tiers le plus haut), la valeur de « Humeur » est en moyenne plus basse de 2,0 points (comparé sur 60 jours ; tiers haut : 20 jours, tiers bas : 20 jours) que les jours où cette valeur est parmi les plus basses.',
    );
  });

  it('should keep the lag variant for a continuous predictor', () => {
    // Act
    const sentence = summarizeFinding(
      finding({
        lag: 1,
        category: 'language',
        key: 'word_count',
        label: 'x',
        effect: continuousEffect,
      }),
      'Humeur',
    );

    // Assert
    expect(
      sentence.startsWith(
        'Le lendemain des jours où la valeur de « Longueur de ta note » est parmi les plus hautes (le tiers le plus haut),',
      ),
    ).toBe(true);
  });

  it('should phrase a theme as what the note talks about', () => {
    // Act
    const sentence = summarizeFinding(
      finding({ key: 'work_studies', label: 'Travail', category: 'theme' }),
      'Humeur',
    );

    // Assert
    expect(
      sentence.startsWith(
        'Les jours où ta note parle du travail ou des études, la valeur de « Humeur »',
      ),
    ).toBe(true);
  });

  it('should phrase an event as appearing in the note', () => {
    // Act
    const sentence = summarizeFinding(finding({ category: 'event' }), 'Humeur');

    // Assert
    expect(
      sentence.startsWith('Les jours où « Sport » apparaît dans ta note,'),
    ).toBe(true);
  });

  it('should keep "est présent" for a field of the user', () => {
    // Act
    const sentence = summarizeFinding(finding({ category: 'field' }), 'Humeur');

    // Assert
    expect(sentence.startsWith('Les jours où « Sport » est présent,')).toBe(
      true,
    );
  });

  it('should not address a tracked subject in the second person', () => {
    // Arrange
    const variants = [
      finding({ key: 'work_studies', label: 'Travail', category: 'theme' }),
      finding({ category: 'event', lag: 1 }),
      finding({
        category: 'language',
        key: 'word_count',
        label: 'x',
        effect: continuousEffect,
      }),
    ];

    // Act
    const sentences = variants.map((item) =>
      summarizeFinding(item, 'Humeur', undefined, mochi),
    );

    // Assert
    expect(sentences[0]).toContain('où la note parle du travail ou des études');
    expect(sentences[1]).toContain('apparaît dans la note');
    for (const sentence of sentences) {
      expect(sentence).not.toMatch(SECOND_PERSON);
      expect(sentence).not.toMatch(FORBIDDEN);
    }
  });
});

describe('night metrics and units', () => {
  const futureTheme = finding({
    key: 'future',
    label: 'Avenir',
    category: 'theme',
    effect: { ...continuousEffect, difference: -0.7, countHigh: 24 },
  });

  it('should tell the sleep target in hours with minutes and the night first', () => {
    // Act
    const sentence = summarizeFinding(
      futureTheme,
      'Temps de sommeil',
      undefined,
      undefined,
      {
        targetUnit: { label: 'h' },
        targetIsNight: true,
      },
    );

    // Assert
    expect(sentence).toBe(
      "La nuit qui précède les jours où ta note parle beaucoup de l'avenir ou de l'incertitude (le tiers le plus haut), la valeur de « Temps de sommeil » est en moyenne plus basse de 0,7 h, soit environ 40 min (comparé sur 60 jours ; tiers haut : 24 jours, tiers bas : 20 jours) que lorsque cette valeur est parmi les plus basses.",
    );
    expect(sentence).not.toMatch(FORBIDDEN);
  });

  it('should put the night after the day for a night target at lag 1', () => {
    // Act
    const sentence = summarizeFinding(
      { ...futureTheme, lag: 1 },
      'Temps de sommeil',
      'h',
      undefined,
      { targetIsNight: true },
    );

    // Assert
    expect(
      sentence.startsWith('La nuit qui suit les jours où ta note parle'),
    ).toBe(true);
  });

  it('should start from the night when it is the predictor', () => {
    // Arrange
    const sleep = finding({
      key: 'field:f1',
      label: 'Temps de sommeil',
      category: 'body',
      effect: continuousEffect,
    });

    // Act
    const sameDay = summarizeFinding(sleep, 'Humeur', undefined, undefined, {
      predictorIsNight: true,
    });
    const nextDay = summarizeFinding(
      { ...sleep, lag: 1 },
      'Humeur',
      undefined,
      undefined,
      {
        predictorIsNight: true,
      },
    );

    // Assert
    expect(
      sameDay.startsWith(
        'Après les nuits où la valeur de « Temps de sommeil » est parmi les plus hautes (le tiers le plus haut),',
      ),
    ).toBe(true);
    expect(
      nextDay.startsWith(
        'Le lendemain des jours qui suivent les nuits où la valeur de « Temps de sommeil »',
      ),
    ).toBe(true);
  });

  it.each([
    [{ label: 'bpm' }, 'plus basse de 2,0 bpm'],
    [{ label: 'min' }, 'plus basse de 2,0 min'],
    [{ label: 'pas' }, 'plus basse de 2,0 pas'],
    [{ label: 'kcal' }, 'plus basse de 2,0 kcal'],
    [{ label: 'ms' }, 'plus basse de 2,0 ms'],
  ])('should show the unit %j', (unit, expected) => {
    // Act
    const sentence = summarizeFinding(
      finding({ effect: continuousEffect }),
      'X',
      unit,
    );

    // Assert
    expect(sentence).toContain(expected);
  });

  it('should tell a bedtime difference in minutes, earlier or later', () => {
    // Arrange
    const effect = { ...continuousEffect, difference: -0.5 };

    // Act
    const sentence = summarizeFinding(finding({ effect }), 'Coucher', {
      label: 'min',
      factor: 60,
      clock: true,
    });

    // Assert
    expect(sentence).toContain(
      '« Coucher » est en moyenne décalée plus tôt de 30 min',
    );
  });

  it('should keep a custom field without unit unitless', () => {
    // Act
    const sentence = summarizeFinding(
      finding({ effect: continuousEffect }),
      'Humeur',
    );

    // Assert
    expect(sentence).toContain(
      'plus basse de 2,0 points (comparé sur 60 jours',
    );
  });

  it('should read the measures of linked fields in the report view', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          fieldId: 'sleep-field',
          label: 'Temps de sommeil',
          findings: [futureTheme],
        }),
      ],
    });
    const measures = new Map([
      ['sleep-field', { metric: AppleWatchMetric.SLEEP }],
    ]);

    // Act
    const view = buildPatternReportView(
      report,
      new Set(),
      {},
      undefined,
      measures,
    );

    // Assert
    expect(view.targets[0].findings[0].summary).toContain(
      "La nuit qui précède les jours où ta note parle beaucoup de l'avenir ou de l'incertitude",
    );
    expect(view.targets[0].findings[0].summary).toContain(
      '0,7 h, soit environ 40 min',
    );
  });
});

describe('night metrics in every combination', () => {
  const effect: PatternEffect = { ...continuousEffect, difference: -0.5 };
  const theme = finding({
    key: 'money',
    label: 'Argent',
    category: 'theme',
    effect,
  });
  const sleepPredictor = finding({
    key: 'field:sleep',
    label: 'Temps de sommeil',
    category: 'body',
    effect,
  });

  it.each([
    [0, 'La nuit qui précède les jours où ta note parle beaucoup de l'],
    [1, 'La nuit qui suit les jours où ta note parle beaucoup de l'],
  ] as const)('should order a night target at lag %s', (lag, start) => {
    // Act
    const sentence = summarizeFinding(
      { ...theme, lag },
      'Temps de sommeil',
      'h',
      undefined,
      { targetIsNight: true },
    );

    // Assert
    expect(sentence.startsWith(start)).toBe(true);
    expect(sentence).toContain('plus basse de 0,5 h, soit environ 30 min');
  });

  it.each([
    [0, 'Après les nuits où la valeur de « Temps de sommeil »'],
    [
      1,
      'Le lendemain des jours qui suivent les nuits où la valeur de « Temps de sommeil »',
    ],
  ] as const)('should order a night predictor at lag %s', (lag, start) => {
    // Act
    const sentence = summarizeFinding(
      { ...sleepPredictor, lag },
      'Humeur',
      undefined,
      undefined,
      { predictorIsNight: true },
    );

    // Assert
    expect(sentence.startsWith(start)).toBe(true);
    expect(sentence).not.toMatch(/fait dormir|à cause/);
  });
});

describe('levers versus companions', () => {
  it.each<[ColumnCategory, boolean]>([
    ['field', true],
    ['event', true],
    ['person', true],
    ['custom', true],
    ['state', false],
    ['theme', false],
    ['language', false],
    ['logging', false],
  ])(
    'should classify the category %s as actionable: %s',
    (category, expected) => {
      // Act
      const actionable = isActionablePredictor({ category });

      // Assert
      expect(actionable).toBe(expected);
    },
  );

  it('should classify Apple Health metrics and nights beside a night target', () => {
    // Assert
    expect(
      isActionablePredictor({
        category: 'body',
        predictorMetric: AppleWatchMetric.STEPS,
      }),
    ).toBe(true);
    expect(
      isActionablePredictor({
        category: 'body',
        predictorMetric: AppleWatchMetric.HEART_RATE_VARIABILITY,
      }),
    ).toBe(false);
    expect(
      isActionablePredictor({
        category: 'body',
        predictorMetric: AppleWatchMetric.SLEEP_DEEP,
        targetMetric: AppleWatchMetric.SLEEP,
      }),
    ).toBe(false);
    expect(
      isActionablePredictor({
        category: 'body',
        predictorMetric: AppleWatchMetric.SLEEP,
        targetMetric: undefined,
      }),
    ).toBe(true);
  });

  it('should add actionable to the view and keep the moods out of the levers', () => {
    // Arrange
    const report = buildReport({
      targets: [
        buildTarget({
          findings: [
            finding({
              key: 'low_mood',
              label: 'Humeur basse',
              category: 'state',
            }),
            finding({ key: 'physical_activity', category: 'event' }),
          ],
        }),
      ],
    });

    // Act
    const view = buildPatternReportView(report, new Set());

    // Assert
    expect(view.targets[0].findings.map((item) => item.actionable)).toEqual([
      false,
      true,
    ]);
  });
});

describe('negligible effects', () => {
  const target = buildTarget({ targetSd: 2 });

  it('should hide an effect under a quarter of the deviation of the target', () => {
    // Arrange
    const small = finding({ effect: { ...continuousEffect, difference: 0.1 } });
    const real = finding({
      key: 'other',
      effect: { ...continuousEffect, difference: -0.6 },
    });
    const report = buildReport({
      targets: [{ ...target, findings: [small, real] }],
    });

    // Act
    const view = buildPatternReportView(report, new Set());

    // Assert
    expect(view.targets[0].findings.map((item) => item.key)).toEqual(['other']);
  });

  it('should hide a gap under 5 points for a yes/no target and keep reports without deviation', () => {
    // Arrange
    const binaryEffect: PatternEffect = {
      ...continuousEffect,
      kind: 'binary',
      targetBinary: true,
      meanWhenHigh: 0.22,
      meanWhenLow: 0.2,
      difference: 0.02,
    };

    // Assert
    expect(isNegligibleEffect(binaryEffect, undefined, true)).toBe(true);
    expect(isNegligibleEffect(continuousEffect, undefined, false)).toBe(false);
    expect(isNegligibleEffect(continuousEffect, 2, false)).toBe(false);
  });
});

describe('before the difficult days', () => {
  it('should tell the baseline of the other days', () => {
    // Act
    const sentence = summarizeBeforeDifficultItem(
      buildBeforeItem({
        label: "Crise d'angoisse",
        countBefore: 8,
        daysBefore: 70,
        frequencyOther: 0.05,
      }),
    );

    // Assert
    expect(sentence).toBe(
      "« Crise d'angoisse » est présent 8 fois sur 70 jours dans les 3 jours avant tes journées difficiles, contre 5 % des autres jours.",
    );
  });
});
