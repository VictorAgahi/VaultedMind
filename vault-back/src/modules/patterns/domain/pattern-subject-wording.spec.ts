import { signalContext } from '../../signals/domain/signal-context.js';
import type { SignalView } from '../../signals/domain/signal-view.js';
import type { TrackedSubject } from '../../signals/domain/tracked-subject.js';
import { buildDailyMatrix, type MatrixDayInput } from './daily-matrix.js';
import { renderPatternBrief } from './pattern-brief.js';
import {
  buildBeforeItem,
  buildReport,
  buildTarget,
} from './pattern-fixtures.js';
import { buildPatternReportView } from './pattern-report-view.js';
import {
  summarizeBeforeDifficultItem,
  summarizeScoreTextGap,
} from './pattern-summaries.js';

const SECOND_PERSON = /\b(tu|ton|tes|ta|te|t')\b/i;
const mochi: TrackedSubject = {
  kind: 'ANIMAL',
  name: 'Mochi',
  species: 'chat',
};
const gap = { date: '2026-03-04', scoreDelta: 2 } as unknown as Parameters<
  typeof summarizeScoreTextGap
>[0];

describe('wording for a tracked subject', () => {
  it('should keep the second person for the user', () => {
    // Act
    const before = summarizeBeforeDifficultItem(buildBeforeItem());
    const textGap = summarizeScoreTextGap(gap);

    // Assert
    expect(before).toContain('tes journées difficiles');
    expect(textGap).toContain('ton score');
  });

  it.each([
    [mochi, 'les journées difficiles de Mochi'],
    [{ kind: 'ANIMAL', species: 'chat' }, 'les journées difficiles du chat'],
    [{ kind: 'OTHER_PERSON' }, 'les journées difficiles de la personne suivie'],
  ])(
    'should name the subject in before-difficult-days sentences (%j)',
    (subject, expected) => {
      // Act
      const sentence = summarizeBeforeDifficultItem(
        buildBeforeItem(),
        undefined,
        subject,
      );

      // Assert
      expect(sentence).toContain(expected);
      expect(sentence).not.toMatch(SECOND_PERSON);
    },
  );

  it('should not address the user in the score versus text gap', () => {
    // Act
    const sentence = summarizeScoreTextGap(gap, mochi);

    // Assert
    expect(sentence).not.toMatch(SECOND_PERSON);
  });

  it('should carry the subject through the report view and the brief', () => {
    // Arrange
    const report = buildReport({
      targets: [buildTarget({ scoreTextGaps: [gap] })],
      stateChangePoints: [
        {
          key: 'stress_level',
          label: 'Stress',
          date: '2026-03-01',
          meanBefore: 1,
          meanAfter: 3,
          difference: 2,
          differenceInSd: 1,
          p: 0.01,
          favourable: false,
        },
      ],
    });
    const valid = new Set(['field-1']);

    // Act
    const view = buildPatternReportView(report, valid, {}, mochi);
    const brief = renderPatternBrief(report, {}, mochi);
    const sentences = [
      ...view.targets.flatMap((target) => [
        ...(target.beforeDifficultDays?.items.map((item) => item.summary) ??
          []),
        ...target.scoreTextGaps.map((item) => item.summary),
      ]),
      brief,
    ];

    // Assert
    for (const sentence of sentences) {
      expect(sentence).not.toMatch(SECOND_PERSON);
    }
    expect(brief).toContain('Changements des signaux observés de Mochi');
  });
});

describe('matrix for a tracked subject', () => {
  const markers = {
    wordCount: 50,
    absolutistRatio: 0.02,
    firstPersonRatio: 0.1,
  };
  const view = (key: string, value: number): SignalView => ({
    key,
    category: 'custom',
    label: 'Litière',
    type: 'noul',
    value,
    corrected: false,
    displayed: false,
    dismissValue: 0,
  });
  const day = (date: string, value: number): MatrixDayInput => ({
    date,
    fieldValues: new Map(),
    signals: { views: [view('custom_c1', value)], markers },
  });
  const customSignals = [
    {
      id: 'c1',
      label: 'Litière',
      question: 'Le chat a-t-il uriné hors de sa litière ?',
      kind: 'yes_no' as const,
      construct: 'elimination' as const,
    },
  ];

  it('should skip the linguistic ratios for another subject', () => {
    // Act
    const self = buildDailyMatrix([day('2026-03-01', 1)], [], signalContext());
    const pet = buildDailyMatrix(
      [day('2026-03-01', 1)],
      [],
      signalContext({ subject: mochi }),
    );

    // Assert
    expect(self.columns.map((column) => column.key)).toEqual(
      expect.arrayContaining(['absolutist_ratio', 'first_person_ratio']),
    );
    const petKeys = pet.columns.map((column) => column.key);
    expect(petKeys).toContain('word_count');
    expect(petKeys).not.toContain('absolutist_ratio');
    expect(petKeys).not.toContain('first_person_ratio');
  });

  it('should add a binary column per custom signal with its construct', () => {
    // Act
    const matrix = buildDailyMatrix(
      [day('2026-03-01', 1), day('2026-03-02', 0)],
      [],
      signalContext({ customSignals }),
    );

    // Assert
    const column = matrix.columns.find((item) => item.key === 'custom_c1');
    expect(column).toMatchObject({
      label: 'Litière',
      category: 'custom',
      kind: 'binary',
      construct: 'elimination',
      values: [1, 0],
    });
  });
});
