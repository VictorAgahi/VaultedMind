import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { FieldType } from '../enums/field-type.enum.js';
import { buildFallbackSuggestions } from './health-linking-fallback.js';
import type { LinkingCandidateField } from './health-linking-validation.js';

function candidate(
  id: string,
  name: string,
  overrides: Partial<LinkingCandidateField> = {},
): LinkingCandidateField {
  return {
    id,
    name,
    fieldType: FieldType.NUMBER,
    isActive: true,
    isHourly: false,
    ...overrides,
  };
}

describe('buildFallbackSuggestions', () => {
  it('should link a field with a typo with an auto-applicable confidence', () => {
    // Arrange
    const fields = [candidate('deep', 'Temps de someil profond')];

    // Act
    const suggestions = buildFallbackSuggestions(
      [AppleWatchMetric.SLEEP_DEEP],
      fields,
    );

    // Assert
    expect(suggestions.get(AppleWatchMetric.SLEEP_DEEP)).toEqual({
      action: 'link',
      fieldId: 'deep',
      unit: 'hours',
      confidence: 0.95,
      reason: 'Nom très proche',
    });
  });

  it('should give an exact name full confidence and keep minutes from the name', () => {
    // Arrange
    const fields = [candidate('sport', "Minutes d'exercice")];

    // Act
    const suggestion = buildFallbackSuggestions(
      [AppleWatchMetric.EXERCISE_MINUTES],
      fields,
    ).get(AppleWatchMetric.EXERCISE_MINUTES);

    // Assert
    expect(suggestion).toMatchObject({
      action: 'link',
      confidence: 1,
      unit: 'minutes',
    });
  });

  it('should only propose a link when two fields match equally', () => {
    // Arrange
    const fields = [candidate('a', 'Pas'), candidate('b', 'Steps')];

    // Act
    const suggestion = buildFallbackSuggestions(
      [AppleWatchMetric.STEPS],
      fields,
    ).get(AppleWatchMetric.STEPS);

    // Assert
    expect(suggestion).toMatchObject({ action: 'link', confidence: 0.5 });
  });

  it('should propose new fields with the static relevance and skip unusable fields', () => {
    // Arrange
    const fields = [
      candidate('inactive', 'Fréquence cardiaque au repos', {
        isActive: false,
      }),
      candidate('linked', 'Calories actives', {
        appleWatchMetric: AppleWatchMetric.STEPS,
      }),
    ];

    // Act
    const suggestions = buildFallbackSuggestions(
      [AppleWatchMetric.RESTING_HEART_RATE, AppleWatchMetric.ACTIVE_CALORIES],
      fields,
    );

    // Assert
    expect(suggestions.get(AppleWatchMetric.RESTING_HEART_RATE)).toEqual({
      action: 'propose_new',
      suggestedName: 'Fréquence cardiaque au repos',
      relevance: 'high',
      reason: '',
    });
    expect(suggestions.get(AppleWatchMetric.ACTIVE_CALORIES)).toMatchObject({
      action: 'propose_new',
      relevance: 'low',
    });
  });

  it('should link the user field "TEMPS SOMMEIL PROFOND" to the deep sleep with full auto confidence', () => {
    // Arrange
    const fields = [
      candidate('deep', 'TEMPS SOMMEIL PROFOND'),
      candidate('total', 'Sommeil'),
    ];

    // Act
    const suggestions = buildFallbackSuggestions(
      [AppleWatchMetric.SLEEP, AppleWatchMetric.SLEEP_DEEP],
      fields,
    );

    // Assert
    expect(suggestions.get(AppleWatchMetric.SLEEP_DEEP)).toMatchObject({
      action: 'link',
      fieldId: 'deep',
      confidence: 0.95,
    });
    expect(suggestions.get(AppleWatchMetric.SLEEP)).toMatchObject({
      action: 'link',
      fieldId: 'total',
      confidence: 1,
    });
  });

  it('should not confuse "Sommeil" with "Sommeil profond"', () => {
    // Arrange
    const fields = [candidate('total', 'Sommeil')];

    // Act
    const suggestions = buildFallbackSuggestions(
      [AppleWatchMetric.SLEEP, AppleWatchMetric.SLEEP_DEEP],
      fields,
    );

    // Assert
    expect(suggestions.get(AppleWatchMetric.SLEEP_DEEP)?.action).toBe(
      'propose_new',
    );
    expect(suggestions.get(AppleWatchMetric.SLEEP)).toMatchObject({
      action: 'link',
      fieldId: 'total',
    });
  });
});
