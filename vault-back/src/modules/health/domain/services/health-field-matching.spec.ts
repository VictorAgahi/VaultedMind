import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  aliasDistance,
  haveSameTokens,
  nameTokens,
  TOKEN_MATCH_COST,
  damerauLevenshteinDistance,
  findFieldsMatchingMetric,
  LinkableField,
  matchMetricsToFields,
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

describe('damerauLevenshteinDistance', () => {
  it('should count insertions, deletions, substitutions and adjacent swaps', () => {
    expect(damerauLevenshteinDistance('sommeil', 'sommeil')).toBe(0);
    expect(damerauLevenshteinDistance('someil', 'sommeil')).toBe(1);
    expect(damerauLevenshteinDistance('sommiel', 'sommeil')).toBe(1);
    expect(damerauLevenshteinDistance('sommeal', 'sommeil')).toBe(1);
    expect(damerauLevenshteinDistance('', 'pas')).toBe(3);
  });
});

describe('aliasDistance', () => {
  it('should tolerate up to two typos on a long name', () => {
    expect(
      aliasDistance(AppleWatchMetric.SLEEP_DEEP, 'Tmps de sommeil profond'),
    ).toBe(1);
    expect(
      aliasDistance(AppleWatchMetric.SLEEP_DEEP, 'Tmps de someil profond'),
    ).toBe(2);
    expect(
      aliasDistance(AppleWatchMetric.SLEEP_DEEP, 'Tmps de someil profnd'),
    ).toBeNull();
  });

  it('should require an exact match on a short name', () => {
    expect(aliasDistance(AppleWatchMetric.STEPS, 'Pas')).toBe(0);
    expect(aliasDistance(AppleWatchMetric.STEPS, 'Pis')).toBeNull();
    expect(aliasDistance(AppleWatchMetric.SLEEP_REM, 'Rem')).toBe(0);
  });
});

describe('matchMetricsToFields', () => {
  it('should link a field with a typo to the metric it is closest to', () => {
    // Arrange
    const fields = [
      field('deep', 'Temps de someil profond'),
      field('total', 'Temps de sommeil'),
    ];

    // Act
    const matches = matchMetricsToFields(
      [AppleWatchMetric.SLEEP, AppleWatchMetric.SLEEP_DEEP],
      fields,
    );

    // Assert
    expect(
      matches.map((match) => [match.metric, match.field.id, match.distance]),
    ).toEqual([
      [AppleWatchMetric.SLEEP, 'total', 0],
      [AppleWatchMetric.SLEEP_DEEP, 'deep', TOKEN_MATCH_COST],
    ]);
  });

  it('should flag a metric that two fields match equally', () => {
    // Arrange
    const fields = [field('a', 'Sommeil profond'), field('b', 'Deep sleep')];

    // Act
    const [match] = matchMetricsToFields([AppleWatchMetric.SLEEP_DEEP], fields);

    // Assert
    expect(match.ambiguous).toBe(true);
  });

  it('should prefer the exact field over a close one', () => {
    // Arrange
    const fields = [
      field('typo', 'Sommeil profnd'),
      field('exact', 'Sommeil profond'),
    ];

    // Act
    const [match] = matchMetricsToFields([AppleWatchMetric.SLEEP_DEEP], fields);

    // Assert
    expect(match).toMatchObject({ distance: 0, ambiguous: false });
    expect(match.field.id).toBe('exact');
  });

  it('should never give a clock-time field a duration', () => {
    // Arrange
    const fields = [field('clock', 'Sommeil', true)];

    // Act
    const matches = matchMetricsToFields([AppleWatchMetric.SLEEP], fields);

    // Assert
    expect(matches).toEqual([]);
  });
});

describe('nameTokens', () => {
  it('should drop filler words, accents, case and punctuation', () => {
    expect(nameTokens('TEMPS DE SOMMEIL PROFOND')).toEqual([
      'sommeil',
      'profond',
    ]);
    expect(nameTokens("Durée d'exercice (total)")).toEqual(['exercice']);
    expect(nameTokens('Temps de')).toEqual([]);
  });
});

describe('haveSameTokens', () => {
  it('should ignore filler words and order', () => {
    expect(haveSameTokens('TEMPS SOMMEIL PROFOND', 'sommeil profond')).toBe(
      true,
    );
    expect(haveSameTokens('Profond sommeil', 'temps de sommeil profond')).toBe(
      true,
    );
  });

  it('should tolerate one typo per long word only', () => {
    expect(haveSameTokens('Sommeil profnd', 'sommeil profond')).toBe(true);
    expect(haveSameTokens('Somil profond', 'sommeil profond')).toBe(false);
    expect(haveSameTokens('Pis', 'pas')).toBe(false);
  });

  it('should not confuse a name with a longer or shorter one', () => {
    expect(haveSameTokens('Sommeil', 'Sommeil profond')).toBe(false);
    expect(haveSameTokens('Sommeil profond', 'Sommeil')).toBe(false);
    expect(haveSameTokens('Temps de', 'Temps')).toBe(false);
  });
});

describe('token matching of real field names', () => {
  function metricsMatching(name: string): AppleWatchMetric[] {
    return matchMetricsToFields(Object.values(AppleWatchMetric), [
      field('f', name),
    ]).map((match) => match.metric);
  }

  it.each([
    ['TEMPS SOMMEIL PROFOND', AppleWatchMetric.SLEEP_DEEP],
    ['Temps sommeil paradoxal', AppleWatchMetric.SLEEP_REM],
    ['Sommeil léger', AppleWatchMetric.SLEEP_CORE],
    ['TEMPS SOMMEIL', AppleWatchMetric.SLEEP],
    ['Temps de sommeil', AppleWatchMetric.SLEEP],
    ['Sommeil', AppleWatchMetric.SLEEP],
    ['Durée du sommeil', AppleWatchMetric.SLEEP],
    ['Nombre de pas', AppleWatchMetric.STEPS],
    ['Mon sommeil profond', AppleWatchMetric.SLEEP_DEEP],
  ])('should link "%s" to its metric only', (name, expected) => {
    expect(metricsMatching(name)).toEqual([expected]);
  });

  it('should never link a sleep stage name to the total sleep', () => {
    expect(metricsMatching('Sommeil profond')).not.toContain(
      AppleWatchMetric.SLEEP,
    );
    expect(metricsMatching('Temps sommeil léger')).not.toContain(
      AppleWatchMetric.SLEEP,
    );
  });

  it('should link nothing for an unrelated or partial name', () => {
    expect(metricsMatching('Humeur')).toEqual([]);
    expect(metricsMatching('Temps')).toEqual([]);
    expect(metricsMatching('Qualité du sommeil')).toEqual([]);
  });
});
