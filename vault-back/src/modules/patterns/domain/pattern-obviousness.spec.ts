import {
  buildFindingKey,
  collectKnownObviousness,
  describeLink,
  isObviousByScore,
  parseObviousnessAnswer,
  resolveObviousness,
  splitByObviousness,
} from './pattern-obviousness.js';
import { buildFinding, buildReport, buildTarget } from './pattern-fixtures.js';

describe('buildFindingKey', () => {
  it('should identify predictor, target, lag and sign', () => {
    // Arrange
    const finding = buildFinding({ key: 'poor_sleep', lag: 1, rho: -0.3 });

    // Act
    const key = buildFindingKey('field:f1', finding);

    // Assert
    expect(key).toBe('poor_sleep|field:f1|1|-');
    expect(buildFindingKey('field:f1', { ...finding, rho: 0.2 })).toBe(
      'poor_sleep|field:f1|1|+',
    );
  });
});

describe('describeLink', () => {
  it('should state a continuous link without any figure', () => {
    // Arrange
    const finding = buildFinding({
      label: 'Sommeil',
      lag: 1,
      rho: 0.4,
      effect: {
        kind: 'continuous',
        meanWhenHigh: 7,
        meanWhenLow: 5,
        countHigh: 20,
        countLow: 20,
        difference: 2,
      },
    });

    // Act
    const statement = describeLink(finding, buildTarget({ label: 'Fatigue' }));

    // Assert
    expect(statement).toBe(
      'Un niveau plus élevé de « Sommeil » est associé à un niveau plus élevé de « Fatigue » le lendemain.',
    );
    expect(statement).not.toMatch(/\d/);
  });

  it('should state a binary predictor and a binary target', () => {
    // Arrange
    const finding = buildFinding({ label: 'Alcool', lag: 0, rho: -0.3 });
    const target = buildTarget({
      label: 'Humeur : agressif',
      binary: true,
      value: 'agressif',
    });

    // Act
    const statement = describeLink(finding, target);

    // Assert
    expect(statement).toBe(
      'La présence de « Alcool » est associée à une présence plus rare de « Humeur : agressif » le même jour.',
    );
  });
});

describe('parseObviousnessAnswer', () => {
  it('should read a score answer', () => {
    expect(
      parseObviousnessAnswer({ type: 'score', score: 2.96, confidence: 0.96 }),
    ).toEqual({ level: 2.96, confidence: 0.96 });
  });

  it('should clamp the level and refuse other answer types', () => {
    expect(
      parseObviousnessAnswer({ type: 'score', score: 7, confidence: 0.6 })
        ?.level,
    ).toBe(3);
    expect(parseObviousnessAnswer({ type: 'noul', noul: 1 })).toBeNull();
    expect(parseObviousnessAnswer(undefined)).toBeNull();
  });
});

describe('isObviousByScore', () => {
  it.each([
    [{ level: 2, confidence: 0.5 }, true],
    [{ level: 1.5, confidence: 0.9 }, true],
    [{ level: 1.49, confidence: 0.9 }, false],
    [{ level: 3, confidence: 0.49 }, false],
    [null, false],
    [undefined, false],
  ])('should judge %j as %s', (score, expected) => {
    expect(isObviousByScore(score)).toBe(expected);
  });
});

describe('resolveObviousness', () => {
  const key = 'k';

  it('should let the user override beat the AI score, both ways', () => {
    // Arrange
    const obviousByAi = buildFinding({
      obviousness: { level: 3, confidence: 0.9 },
    });
    const surprisingByAi = buildFinding({
      obviousness: { level: 0, confidence: 0.9 },
    });

    // Act / Assert
    expect(resolveObviousness(obviousByAi, key, { k: false })).toEqual({
      obvious: false,
      source: 'user',
    });
    expect(resolveObviousness(surprisingByAi, key, { k: true })).toEqual({
      obvious: true,
      source: 'user',
    });
  });

  it('should use the AI score without override', () => {
    expect(
      resolveObviousness(
        buildFinding({ obviousness: { level: 3, confidence: 0.9 } }),
        key,
        {},
      ),
    ).toEqual({ obvious: true, source: 'jev' });
  });

  it('should treat a link without score as not obvious, with no source', () => {
    expect(resolveObviousness(buildFinding(), key, {})).toEqual({
      obvious: false,
      source: null,
    });
    expect(
      resolveObviousness(buildFinding({ obviousness: null }), key, {}),
    ).toEqual({ obvious: false, source: null });
  });
});

describe('collectKnownObviousness', () => {
  it('should index the previous scores by finding key', () => {
    // Arrange
    const scored = buildFinding({
      key: 'a',
      obviousness: { level: 1, confidence: 0.8 },
    });
    const unscored = buildFinding({ key: 'b', obviousness: null });
    const report = buildReport({
      targets: [buildTarget({ findings: [scored, unscored] })],
    });

    // Act
    const known = collectKnownObviousness(report);

    // Assert
    expect([...known.keys()]).toEqual([
      buildFindingKey('field:field-1', scored),
    ]);
    expect(collectKnownObviousness(null).size).toBe(0);
  });
});

describe('splitByObviousness', () => {
  it('should separate obvious findings, honouring overrides', () => {
    // Arrange
    const obvious = buildFinding({
      key: 'a',
      obviousness: { level: 3, confidence: 0.9 },
    });
    const plain = buildFinding({ key: 'b' });
    const forced = buildFinding({ key: 'c' });
    const target = buildTarget({ findings: [obvious, plain, forced] });
    const overrides = { [buildFindingKey(target.key, forced)]: true };

    // Act
    const split = splitByObviousness(target, overrides);

    // Assert
    expect(split.main.map((f) => f.key)).toEqual(['b']);
    expect(split.expected.map((f) => f.key)).toEqual(['a', 'c']);
  });
});
