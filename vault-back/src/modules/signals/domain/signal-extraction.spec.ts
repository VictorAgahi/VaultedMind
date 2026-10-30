import {
  buildJevQuestions,
  buildSignalsSourceInput,
  mapResponseToPayload,
} from './signal-extraction.js';
import type { JevResponse } from './jev-types.js';
import type { Person } from './person.js';
import { QUESTION_BANK_VERSION } from './question-bank.js';

const people: Person[] = [{ id: 'p1', alias: 'Compagne', variants: ['Marie'] }];

describe('buildJevQuestions', () => {
  it('should build the static bank plus two questions per person', () => {
    // Act
    const without = buildJevQuestions([]);
    const withPeople = buildJevQuestions(people);

    // Assert
    expect(Object.keys(withPeople).length).toBe(
      Object.keys(without).length + 2,
    );
    const present = withPeople['person_p1_present'];
    expect(present.type).toBe('noul');
    expect(present.instructions).toContain('[Compagne]');
    expect(withPeople['person_p1_tone']).toMatchObject({ type: 'score' });
  });

  it('should give score questions between 2 and 10 ordered criteria', () => {
    // Act
    const questions = Object.values(buildJevQuestions(people));

    // Assert
    for (const question of questions) {
      if (question.type === 'score') {
        expect(question.criteria.length).toBeGreaterThanOrEqual(2);
        expect(question.criteria.length).toBeLessThanOrEqual(10);
      }
    }
  });

  it('should never contain real names, only aliases', () => {
    // Act
    const serialized = JSON.stringify(buildJevQuestions(people));

    // Assert
    expect(serialized).not.toContain('Marie');
  });
});

describe('mapResponseToPayload', () => {
  it('should map answers and compute markers from the raw notes', () => {
    // Arrange
    const response: JevResponse = {
      model: 'jev-1.14.0',
      answers: {
        conflict: { type: 'noul', noul: 0.9 },
        rumination: { type: 'score', score: 3.2, confidence: 0.8 },
      },
    };

    // Act
    const payload = mapResponseToPayload(
      response,
      people,
      'Je fais jamais rien',
    );

    // Assert
    expect(payload.model).toBe('jev-1.14.0');
    expect(payload.answers['conflict']).toEqual({ value: 0.9 });
    expect(payload.answers['rumination']).toEqual({
      value: 3.2,
      confidence: 0.8,
    });
    expect(payload.markers.wordCount).toBe(4);
  });

  it('should leave out missing, mistyped and out-of-range answers', () => {
    // Arrange
    const response: JevResponse = {
      model: 'jev-1.14.0',
      answers: {
        conflict: { type: 'score', score: 1, confidence: 1 },
        alcohol: { type: 'noul', noul: 1.5 },
        fatigue: { type: 'score', score: 9, confidence: 1 },
        unknown_key: { type: 'noul', noul: 1 },
      },
    };

    // Act
    const payload = mapResponseToPayload(response, [], 'texte');

    // Assert
    expect(payload.answers).toEqual({});
  });
});

describe('buildSignalsSourceInput', () => {
  it('should change with notes, bank version and people', () => {
    // Act
    const base = buildSignalsSourceInput('note', people);
    const otherNote = buildSignalsSourceInput('note 2', people);
    const otherPeople = buildSignalsSourceInput('note', []);

    // Assert
    expect(base).toContain(QUESTION_BANK_VERSION);
    expect(otherNote).not.toBe(base);
    expect(otherPeople).not.toBe(base);
  });
});
