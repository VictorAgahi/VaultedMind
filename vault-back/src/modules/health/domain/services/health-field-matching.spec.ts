import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  findFieldsMatchingMetric,
  LinkableField,
  normalizeFieldName,
} from './health-field-matching.js';

function field(id: string, name: string, isHourly = false): LinkableField {
  return { id, name, isHourly };
}

describe('normalizeFieldName', () => {
  it('should drop accents, case, punctuation and extra spaces', () => {
    // Arrange / Act
    const normalized = normalizeFieldName("  Minutes   d'Exercice !! ");

    // Assert
    expect(normalized).toBe('minutes d exercice');
  });

  it('should fold accented letters', () => {
    expect(normalizeFieldName('Fréquence cardiaque au REPOS')).toBe(
      'frequence cardiaque au repos',
    );
  });
});

describe('findFieldsMatchingMetric', () => {
  it('should match a French name regardless of accents and case', () => {
    // Arrange
    const fields = [
      field('a', 'Temps de sommeil PROFOND'),
      field('b', 'Humeur'),
    ];

    // Act
    const matches = findFieldsMatchingMetric(
      AppleWatchMetric.SLEEP_DEEP,
      fields,
    );

    // Assert
    expect(matches.map((match) => match.id)).toEqual(['a']);
  });

  it('should match the accented French name of a sleep stage', () => {
    // Arrange
    const fields = [field('a', 'Temps éveillé la nuit')];

    // Act
    const matches = findFieldsMatchingMetric(
      AppleWatchMetric.SLEEP_AWAKE,
      fields,
    );

    // Assert
    expect(matches.map((match) => match.id)).toEqual(['a']);
  });

  it('should match an English name', () => {
    // Arrange
    const fields = [field('a', 'Deep sleep')];

    // Act
    const matches = findFieldsMatchingMetric(
      AppleWatchMetric.SLEEP_DEEP,
      fields,
    );

    // Assert
    expect(matches).toHaveLength(1);
  });

  it('should not match a name that only contains the alias', () => {
    // Arrange
    const fields = [
      field('a', 'Qualité du sommeil'),
      field('b', 'Pas de chance'),
    ];

    // Act
    const sleep = findFieldsMatchingMetric(AppleWatchMetric.SLEEP, fields);
    const steps = findFieldsMatchingMetric(AppleWatchMetric.STEPS, fields);

    // Assert
    expect(sleep).toEqual([]);
    expect(steps).toEqual([]);
  });

  it('should return every match when several fields share an alias', () => {
    // Arrange
    const fields = [field('a', 'Sommeil'), field('b', 'Heures de sommeil')];

    // Act
    const matches = findFieldsMatchingMetric(AppleWatchMetric.SLEEP, fields);

    // Assert
    expect(matches.map((match) => match.id)).toEqual(['a', 'b']);
  });

  it('should exclude a clock-time field for a duration metric', () => {
    // Arrange
    const fields = [field('a', 'Sommeil', true)];

    // Act
    const matches = findFieldsMatchingMetric(AppleWatchMetric.SLEEP, fields);

    // Assert
    expect(matches).toEqual([]);
  });

  it('should only link an hourly field to the bedtime metric', () => {
    // Arrange
    const fields = [field('a', 'Coucher', false), field('b', 'Coucher', true)];

    // Act
    const matches = findFieldsMatchingMetric(AppleWatchMetric.BEDTIME, fields);

    // Assert
    expect(matches.map((match) => match.id)).toEqual(['b']);
  });
});
