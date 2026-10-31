import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { FieldType } from '../enums/field-type.enum.js';
import type {
  LinkingSuggestion,
  LinkingSuggestions,
} from './health-linking-schema.js';
import {
  validateLinkingSuggestions,
  type LinkingCandidateField,
} from './health-linking-validation.js';

function candidate(
  id: string,
  overrides: Partial<LinkingCandidateField> = {},
): LinkingCandidateField {
  return {
    id,
    name: `Champ ${id}`,
    fieldType: FieldType.NUMBER,
    isActive: true,
    isHourly: false,
    ...overrides,
  };
}

function link(
  fieldId: string,
  confidence = 0.9,
  unit: 'hours' | 'minutes' | null = null,
): LinkingSuggestion {
  return { action: 'link', fieldId, unit, confidence, reason: 'Même sens' };
}

function suggestions(
  entries: Array<[AppleWatchMetric, LinkingSuggestion]>,
): LinkingSuggestions {
  return new Map(entries);
}

describe('validateLinkingSuggestions', () => {
  it('should keep a valid link with its confidence', () => {
    // Arrange
    const fields = [candidate('a')];

    // Act
    const [result] = validateLinkingSuggestions(
      [AppleWatchMetric.STEPS],
      suggestions([[AppleWatchMetric.STEPS, link('a', 0.95)]]),
      fields,
    );

    // Assert
    expect(result).toEqual({
      metric: AppleWatchMetric.STEPS,
      outcome: {
        kind: 'link',
        fieldId: 'a',
        unit: null,
        confidence: 0.95,
        reason: 'Même sens',
      },
    });
  });

  it.each([
    ['unknown_field', [] as LinkingCandidateField[]],
    ['inactive_field', [candidate('a', { isActive: false })]],
    ['not_number', [candidate('a', { fieldType: FieldType.STRING })]],
    [
      'already_linked',
      [candidate('a', { appleWatchMetric: AppleWatchMetric.SLEEP })],
    ],
    ['incompatible_unit', [candidate('a', { isHourly: true })]],
  ])(
    'should turn a link rejected as %s into a proposal of a new field',
    (rejection, fields) => {
      // Arrange / Act
      const [result] = validateLinkingSuggestions(
        [AppleWatchMetric.STEPS],
        suggestions([[AppleWatchMetric.STEPS, link('a')]]),
        fields,
      );

      // Assert
      expect(result.rejection).toBe(rejection);
      expect(result.outcome).toMatchObject({
        kind: 'propose_new',
        suggestedName: 'Pas',
        relevance: 'high',
      });
    },
  );

  it('should give a field claimed twice to the most confident link only', () => {
    // Arrange
    const fields = [candidate('a')];

    // Act
    const results = validateLinkingSuggestions(
      [AppleWatchMetric.SLEEP_DEEP, AppleWatchMetric.SLEEP],
      suggestions([
        [AppleWatchMetric.SLEEP_DEEP, link('a', 0.6)],
        [AppleWatchMetric.SLEEP, link('a', 0.9)],
      ]),
      fields,
    );

    // Assert
    expect(results[0]).toMatchObject({
      metric: AppleWatchMetric.SLEEP_DEEP,
      rejection: 'field_taken',
      outcome: { kind: 'propose_new' },
    });
    expect(results[1].outcome).toMatchObject({ kind: 'link', fieldId: 'a' });
  });

  it('should accept a field already linked to the same metric', () => {
    // Arrange
    const fields = [
      candidate('a', { appleWatchMetric: AppleWatchMetric.STEPS }),
    ];

    // Act
    const [result] = validateLinkingSuggestions(
      [AppleWatchMetric.STEPS],
      suggestions([[AppleWatchMetric.STEPS, link('a')]]),
      fields,
    );

    // Assert
    expect(result.rejection).toBeUndefined();
  });

  it('should let the field hint win over the suggested unit', () => {
    // Arrange
    const fields = [candidate('a', { name: 'Sommeil (min)' })];

    // Act
    const [result] = validateLinkingSuggestions(
      [AppleWatchMetric.SLEEP],
      suggestions([[AppleWatchMetric.SLEEP, link('a', 0.9, 'hours')]]),
      fields,
    );

    // Assert
    expect(result.outcome).toMatchObject({ kind: 'link', unit: 'minutes' });
  });

  it('should use the suggested unit when the field gives no hint, and drop a unit on a count', () => {
    // Arrange
    const fields = [candidate('sleep', { name: 'Repos' }), candidate('steps')];

    // Act
    const results = validateLinkingSuggestions(
      [AppleWatchMetric.SLEEP, AppleWatchMetric.STEPS],
      suggestions([
        [AppleWatchMetric.SLEEP, link('sleep', 0.9, 'minutes')],
        [AppleWatchMetric.STEPS, link('steps', 0.9, 'minutes')],
      ]),
      fields,
    );

    // Assert
    expect(results[0].outcome).toMatchObject({ unit: 'minutes' });
    expect(results[1].outcome).toMatchObject({ unit: null });
  });

  it('should keep skips, clean proposals and propose the metrics left out', () => {
    // Arrange
    const reply = suggestions([
      [AppleWatchMetric.ACTIVE_CALORIES, { action: 'skip', reason: '' }],
      [
        AppleWatchMetric.RESTING_HEART_RATE,
        {
          action: 'propose_new',
          suggestedName: '   ',
          relevance: 'high',
          reason: 'Utile',
        },
      ],
    ]);

    // Act
    const results = validateLinkingSuggestions(
      [
        AppleWatchMetric.ACTIVE_CALORIES,
        AppleWatchMetric.RESTING_HEART_RATE,
        AppleWatchMetric.WATER_CONSUMPTION,
      ],
      reply,
      [],
    );

    // Assert
    expect(results.map((result) => result.outcome)).toEqual([
      { kind: 'skip' },
      {
        kind: 'propose_new',
        suggestedName: 'Fréquence cardiaque au repos',
        relevance: 'high',
        reason: 'Utile',
      },
      {
        kind: 'propose_new',
        suggestedName: 'Eau',
        relevance: 'low',
        reason: '',
      },
    ]);
  });
});
