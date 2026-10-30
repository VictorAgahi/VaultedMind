import { FieldType } from '../../health/domain/enums/field-type.enum.js';
import type { SignalView } from '../../signals/domain/signal-view.js';
import {
  buildDailyMatrix,
  fieldColumnKey,
  type MatrixDayInput,
  type MatrixField,
} from './daily-matrix.js';

const fields: MatrixField[] = [
  { id: 'n', name: 'Humeur', fieldType: FieldType.NUMBER, isActive: true },
  { id: 'b', name: 'Sport', fieldType: FieldType.BOOLEAN, isActive: true },
  {
    id: 's',
    name: 'Energie',
    fieldType: FieldType.STRING,
    isActive: true,
    optionsOrder: ['basse', 'moyenne', 'haute'],
  },
  { id: 'u', name: 'Libre', fieldType: FieldType.STRING, isActive: true },
  { id: 'd', name: 'Date', fieldType: FieldType.DATE, isActive: true },
  { id: 'x', name: 'Inactif', fieldType: FieldType.NUMBER, isActive: false },
  {
    id: 'w',
    name: 'Pas',
    fieldType: FieldType.NUMBER,
    isActive: true,
    appleWatchMetric: 'STEPS',
  },
];

const view = (
  partial: Partial<SignalView> & Pick<SignalView, 'key' | 'type' | 'value'>,
): SignalView => ({
  category: 'event',
  label: partial.key,
  corrected: false,
  displayed: false,
  dismissValue: 0,
  ...partial,
});

const markers = { wordCount: 50, absolutistRatio: 0.02, firstPersonRatio: 0.1 };

const day = (
  date: string,
  values: Record<string, string>,
  views?: SignalView[],
): MatrixDayInput => ({
  date,
  fieldValues: new Map(Object.entries(values)),
  signals: views ? { views, markers } : null,
});

describe('buildDailyMatrix', () => {
  it('should fill missing calendar days with nulls and flag logged days', () => {
    // Arrange
    const logs = [day('2026-03-03', { n: '4' }), day('2026-03-01', { n: '2' })];

    // Act
    const matrix = buildDailyMatrix(logs, fields, []);

    // Assert
    expect(matrix.dates).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
    expect(matrix.logged).toEqual([1, 0, 1]);
    const mood = matrix.columns.find((c) => c.key === fieldColumnKey('n'));
    expect(mood?.values).toEqual([2, null, 4]);
  });

  it('should encode field types and skip unusable fields', () => {
    // Arrange
    const logs = [
      day('2026-03-01', {
        n: '3.5',
        b: 'true',
        s: 'haute',
        u: 'x',
        d: '2026-01-01',
        x: '1',
        w: '9000',
      }),
    ];

    // Act
    const matrix = buildDailyMatrix(logs, fields, []);

    // Assert
    const byKey = new Map(matrix.columns.map((c) => [c.key, c]));
    expect(byKey.get(fieldColumnKey('n'))?.values).toEqual([3.5]);
    expect(byKey.get(fieldColumnKey('b'))).toMatchObject({
      kind: 'binary',
      values: [1],
    });
    expect(byKey.get(fieldColumnKey('s'))?.values).toEqual([2]);
    expect(byKey.get(fieldColumnKey('w'))?.category).toBe('body');
    expect(byKey.has(fieldColumnKey('u'))).toBe(false);
    expect(byKey.has(fieldColumnKey('d'))).toBe(false);
    expect(byKey.has(fieldColumnKey('x'))).toBe(false);
  });

  it('should null low-confidence scores and gate person tone on presence', () => {
    // Arrange
    const people = [{ id: 'p1', alias: 'Proche', variants: ['Marie'] }];
    const logs = [
      day('2026-03-01', {}, [
        view({
          key: 'rumination',
          type: 'score',
          category: 'state',
          value: 3,
          confidence: 0.2,
        }),
        view({
          key: 'work_studies',
          type: 'score',
          category: 'theme',
          value: 3,
          confidence: 0.8,
        }),
        view({
          key: 'person_p1_present',
          type: 'noul',
          category: 'person',
          value: 0.3,
        }),
        view({
          key: 'person_p1_tone',
          type: 'score',
          category: 'person',
          value: 2,
          confidence: 0.9,
        }),
      ]),
      day('2026-03-02', {}, [
        view({
          key: 'person_p1_present',
          type: 'noul',
          category: 'person',
          value: 0.9,
        }),
        view({
          key: 'person_p1_tone',
          type: 'score',
          category: 'person',
          value: 2,
          confidence: 0.9,
        }),
      ]),
    ];

    // Act
    const matrix = buildDailyMatrix(logs, [], people);

    // Assert
    const byKey = new Map(matrix.columns.map((c) => [c.key, c]));
    expect(byKey.has('rumination')).toBe(false);
    expect(byKey.get('work_studies')?.values).toEqual([3, null]);
    expect(byKey.get('person_p1_tone')?.values).toEqual([null, 2]);
    expect(byKey.get('person_p1_present')?.kind).toBe('binary');
    expect(byKey.get('word_count')?.category).toBe('language');
  });
});
