import {
  buildFieldConstructQuestion,
  describeFieldForClassification,
  parseConstructAnswer,
} from './field-construct.js';
import { CONSTRUCTS } from './constructs.js';

describe('field construct classification', () => {
  it('should offer every construct as an option of the choice question', () => {
    // Act
    const question = buildFieldConstructQuestion();

    // Assert
    expect(question.type).toBe('choice');
    if (question.type !== 'choice') return;
    expect(Object.keys(question.criteria).sort()).toEqual(
      [...CONSTRUCTS].sort(),
    );
  });

  it('should describe the field with its category and options', () => {
    expect(
      describeFieldForClassification({
        name: ' Humeur ',
        category: 'Santé',
        optionsOrder: ['bas', 'haut'],
      }),
    ).toBe(
      'Nom du champ : Humeur\nCatégorie : Santé\nValeurs possibles : bas, haut',
    );
    expect(describeFieldForClassification({ name: 'Pas' })).toBe(
      'Nom du champ : Pas',
    );
  });

  it('should accept a confident answer from the closed list', () => {
    expect(
      parseConstructAnswer({
        type: 'choice',
        choice: 'mood',
        confidence: 0.9,
        probabilities: { mood: 0.9 },
      }),
    ).toBe('mood');
  });

  it('should fall back to other when unsure, unknown or of another type', () => {
    expect(
      parseConstructAnswer({
        type: 'choice',
        choice: 'mood',
        confidence: 0.49,
        probabilities: {},
      }),
    ).toBe('other');
    expect(
      parseConstructAnswer({
        type: 'choice',
        choice: 'invented',
        confidence: 1,
        probabilities: {},
      }),
    ).toBe('other');
    expect(parseConstructAnswer({ type: 'noul', noul: 1 })).toBe('other');
    expect(parseConstructAnswer(undefined)).toBe('other');
  });
});
