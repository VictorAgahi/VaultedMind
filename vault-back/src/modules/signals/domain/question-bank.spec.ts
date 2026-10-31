import { isConstruct } from './constructs.js';
import {
  buildCustomSignalQuestion,
  buildQuestionBank,
  questionBankVersion,
} from './question-bank.js';
import { signalContext } from './signal-context.js';
import {
  buildSignalsSourceInput,
  buildJevQuestions,
} from './signal-extraction.js';
import type { CustomSignal } from './custom-signal.js';
import type { TrackedSubject } from './tracked-subject.js';

const animal: TrackedSubject = {
  kind: 'ANIMAL',
  name: 'Mochi',
  species: 'chat',
};
const keysOf = (subject: TrackedSubject): string[] =>
  buildQuestionBank(signalContext({ subject })).map((question) => question.key);

describe('question bank per tracked subject', () => {
  it('should keep the self bank unchanged', () => {
    // Act
    const keys = keysOf({ kind: 'SELF' });

    // Assert
    expect(keys).toContain('rumination');
    expect(keys).toContain('self_criticism');
    expect(keys).toContain('alcohol');
    expect(questionBankVersion('SELF')).toBe('v1');
  });

  it('should drop the self-report only items for another person', () => {
    // Act
    const keys = keysOf({ kind: 'OTHER_PERSON', name: 'Paul' });
    const instructions = Object.values(
      buildJevQuestions(
        signalContext({ subject: { kind: 'OTHER_PERSON', name: 'Paul' } }),
      ),
    )
      .map((question) => question.instructions)
      .join(' ');

    // Assert
    expect(keys).not.toContain('rumination');
    expect(keys).not.toContain('self_criticism');
    expect(keys).not.toContain('sense_of_control');
    expect(keys).toContain('expressed_anxiety');
    expect(keys).toContain('low_mood');
    expect(instructions).toContain('la personne suivie');
    expect(instructions).not.toContain('Paul');
  });

  it('should build the animal bank with its behaviour questions', () => {
    // Act
    const bank = buildQuestionBank(signalContext({ subject: animal }));
    const keys = bank.map((question) => question.key);

    // Assert
    expect(keys).toEqual(
      expect.arrayContaining([
        'aggression',
        'house_soiling',
        'excessive_vocalisation',
        'hiding',
        'destructive_behaviour',
        'play',
        'appetite_problem',
        'vomiting',
        'grooming_excess',
        'strangers_visit',
        'loud_noise',
        'owner_absence',
        'routine_change',
        'other_animal_tension',
        'vet_or_medication',
        'outdoor_access',
        'stress_level',
        'energy_level',
        'seeks_contact',
        'calm',
      ]),
    );
    expect(keys).not.toContain('alcohol');
    expect(keys).not.toContain('rumination');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should give every animal question a known construct and ordered criteria', () => {
    // Act
    const bank = buildQuestionBank(signalContext({ subject: animal }));

    // Assert
    for (const question of bank) {
      expect(isConstruct(question.construct)).toBe(true);
      if (question.type === 'score') {
        expect(question.criteria).toHaveLength(5);
        expect(question.levelLabels).toHaveLength(5);
      }
    }
    const states = bank.filter((question) => question.type === 'score');
    expect(states.map((question) => question.key)).toEqual([
      'stress_level',
      'energy_level',
      'seeks_contact',
      'calm',
    ]);
    const stress = states[0];
    expect(stress.type === 'score' && stress.criteria[0]).toMatch(/Aucun/);
    expect(stress.type === 'score' && stress.criteria[4]).toMatch(/très fort/);
  });

  it('should name the animal in the instructions', () => {
    // Act
    const questions = buildJevQuestions(signalContext({ subject: animal }));

    // Assert
    expect(questions.aggression.instructions).toContain('Mochi (le chat)');
    expect(questions.owner_absence.instructions).toContain('Mochi (le chat)');
  });

  it('should phrase the people questions for the observer', () => {
    // Act
    const questions = buildJevQuestions(
      signalContext({
        subject: animal,
        people: [{ id: 'p1', alias: 'Marie', variants: ['Marie'] }],
      }),
    );

    // Assert
    expect(questions.person_p1_present.instructions).toContain('[Marie]');
    expect(questions.person_p1_present.instructions).toContain('Mochi');
  });
});

describe('bank versions in the source hash', () => {
  it('should differ per tracked subject kind', () => {
    // Act
    const self = buildSignalsSourceInput('note', signalContext());
    const observed = buildSignalsSourceInput(
      'note',
      signalContext({ subject: { kind: 'OTHER_PERSON' } }),
    );
    const pet = buildSignalsSourceInput(
      'note',
      signalContext({ subject: animal }),
    );
    const renamed = buildSignalsSourceInput(
      'note',
      signalContext({ subject: { ...animal, name: 'Felix' } }),
    );

    // Assert
    expect(new Set([self, observed, pet, renamed]).size).toBe(4);
    expect(pet).toContain(questionBankVersion('ANIMAL'));
  });

  it('should keep the input of a default context unchanged', () => {
    // Act
    const input = buildSignalsSourceInput('note', signalContext());

    // Assert
    expect(input).toBe('{"notes":"note","bank":"v1","people":[]}');
  });
});

describe('custom signals in the bank', () => {
  const custom: CustomSignal = {
    id: 'c1',
    label: 'Litière',
    question: 'Le chat a-t-il uriné hors de sa litière ?',
    kind: 'yes_no',
    construct: 'elimination',
  };

  it('should add a noul question per signal with its construct', () => {
    // Act
    const questions = buildJevQuestions(
      signalContext({ customSignals: [custom] }),
    );
    const question = buildCustomSignalQuestion(custom);

    // Assert
    expect(questions.custom_c1).toEqual({
      type: 'noul',
      instructions: custom.question,
    });
    expect(question.category).toBe('custom');
    expect(question.construct).toBe('elimination');
    expect(
      buildCustomSignalQuestion({ ...custom, construct: undefined }).construct,
    ).toBe('other');
  });

  it('should re-extract when a signal is added or edited, but not when only its construct changes', () => {
    // Act
    const none = buildSignalsSourceInput('note', signalContext());
    const added = buildSignalsSourceInput(
      'note',
      signalContext({ customSignals: [custom] }),
    );
    const edited = buildSignalsSourceInput(
      'note',
      signalContext({ customSignals: [{ ...custom, label: 'Pipi' }] }),
    );
    const reclassified = buildSignalsSourceInput(
      'note',
      signalContext({ customSignals: [{ ...custom, construct: 'other' }] }),
    );

    // Assert
    expect(added).not.toBe(none);
    expect(edited).not.toBe(added);
    expect(reclassified).toBe(added);
  });
});
