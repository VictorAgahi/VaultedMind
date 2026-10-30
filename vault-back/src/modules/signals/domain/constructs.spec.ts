import { AppleWatchMetric } from '../../health/domain/enums/apple-watch-metric.enum.js';
import {
  CONSTRUCTS,
  effectiveConstruct,
  isConstruct,
  personConstruct,
  sharesConstruct,
} from './constructs.js';
import { STATIC_QUESTION_BANK, buildQuestionBank } from './question-bank.js';

describe('constructs', () => {
  it('should give every static question a construct of the closed list', () => {
    for (const question of STATIC_QUESTION_BANK) {
      expect(CONSTRUCTS as readonly string[]).toContain(question.construct);
    }
  });

  it('should give both questions of a person the construct of that person', () => {
    // Arrange
    const people = [{ id: 'abc', alias: 'Personne A', variants: ['A'] }];

    // Act
    const person = buildQuestionBank(people).filter(
      (question) => question.category === 'person',
    );

    // Assert
    expect(person).toHaveLength(2);
    expect(person.map((question) => question.construct)).toEqual([
      'person:abc',
      'person:abc',
    ]);
    expect(personConstruct('abc')).toBe('person:abc');
  });

  it.each([
    [AppleWatchMetric.SLEEP, 'sleep'],
    [AppleWatchMetric.STEPS, 'physical_activity'],
    [AppleWatchMetric.ACTIVE_CALORIES, 'physical_activity'],
    [AppleWatchMetric.RESTING_HEART_RATE, 'physical_health'],
    [AppleWatchMetric.MINDFULNESS_MINUTES, 'mindfulness'],
    [AppleWatchMetric.WATER_CONSUMPTION, 'other'],
  ])('should map the Apple Watch metric %s to %s', (metric, expected) => {
    // Act
    const construct = effectiveConstruct({
      appleWatchMetric: metric,
      construct: 'mood',
      constructOverride: 'work',
    });

    // Assert
    expect(construct).toBe(expected);
  });

  it('should let the override beat the automatic construct, then fall back to other', () => {
    expect(
      effectiveConstruct({ construct: 'mood', constructOverride: 'anxiety' }),
    ).toBe('anxiety');
    expect(effectiveConstruct({ construct: 'mood' })).toBe('mood');
    expect(effectiveConstruct({ construct: 'not_in_the_list' })).toBe('other');
    expect(effectiveConstruct({})).toBe('other');
  });

  it('should consider "other" as never shared', () => {
    expect(sharesConstruct('other', 'other')).toBe(false);
    expect(sharesConstruct('sleep', 'sleep')).toBe(true);
    expect(sharesConstruct('sleep', 'fatigue')).toBe(false);
    expect(sharesConstruct('person:a', 'person:a')).toBe(true);
  });

  it('should recognise members of the closed list only', () => {
    expect(isConstruct('sleep')).toBe(true);
    expect(isConstruct('person:a')).toBe(false);
    expect(isConstruct('nonsense')).toBe(false);
  });
});
