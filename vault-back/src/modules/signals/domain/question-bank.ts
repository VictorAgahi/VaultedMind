import { buildAnimalQuestionBank } from './animal-question-bank.js';
import {
  constructOfCustomSignal,
  customSignalKey,
  type CustomSignal,
} from './custom-signal.js';
import { personConstruct } from './constructs.js';
import { buildObservedQuestionBank } from './observed-question-bank.js';
import type { Person } from './person.js';
import type { BankQuestion } from './question-types.js';
import { STATIC_QUESTION_BANK } from './self-question-bank.js';
import type { SignalContext } from './signal-context.js';
import { OBSERVED_PERSON_ALIAS } from './subject-pseudonym.js';
import { describeSubject, type TrackedSubject } from './tracked-subject.js';
import type { TrackedSubjectKind } from './tracked-subject.js';

export type {
  BankQuestion,
  NoulQuestion,
  QuestionCategory,
  QuestionType,
  ScoreQuestion,
} from './question-types.js';
export {
  EVENT_QUESTIONS,
  STATE_QUESTIONS,
  STATIC_QUESTION_BANK,
  THEME_QUESTIONS,
} from './self-question-bank.js';

/** Bumped whenever the questions of a bank change: stored signals then become stale. */
export const QUESTION_BANK_VERSIONS: Record<TrackedSubjectKind, string> = {
  SELF: 'v1',
  OTHER_PERSON: 'observer-v1',
  ANIMAL: 'animal-v1',
};

export function questionBankVersion(kind: TrackedSubjectKind): string {
  return QUESTION_BANK_VERSIONS[kind];
}

export const PERSON_TONE_LEVEL_LABELS = ['tendue', 'neutre', 'agréable'];

export function personPresentKey(personId: string): string {
  return `person_${personId}_present`;
}

export function personToneKey(personId: string): string {
  return `person_${personId}_tone`;
}

/** Who the questions are about, as sent to Jev: the name of another person never leaves the server. */
function askedSubject(subject: TrackedSubject): string {
  return subject.kind === 'OTHER_PERSON'
    ? OBSERVED_PERSON_ALIAS
    : describeSubject(subject);
}

/** How the presence question names who spends the time with the person of the entourage. */
function presenceInstructions(
  subject: TrackedSubject,
  reference: string,
): string {
  if (subject.kind === 'SELF') {
    return `La personne a-t-elle passé un moment avec ${reference} ou interagi avec ${reference} ?`;
  }
  return `La note décrit-elle un moment de ${askedSubject(subject)} avec ${reference} ou une interaction entre eux ?`;
}

function toneInstructions(subject: TrackedSubject, reference: string): string {
  return subject.kind === 'SELF'
    ? `Comment s'est passée l'interaction avec ${reference} ?`
    : `Comment s'est passée l'interaction entre ${askedSubject(subject)} et ${reference} ?`;
}

export function buildPersonQuestions(
  person: Person,
  subject: TrackedSubject,
): BankQuestion[] {
  const reference = `[${person.alias}]`;
  return [
    {
      key: personPresentKey(person.id),
      category: 'person',
      construct: personConstruct(person.id),
      type: 'noul',
      label: person.alias,
      instructions: presenceInstructions(subject, reference),
    },
    {
      key: personToneKey(person.id),
      category: 'person',
      construct: personConstruct(person.id),
      type: 'score',
      label: person.alias,
      instructions: toneInstructions(subject, reference),
      criteria: [
        'Interaction tendue ou négative',
        'Interaction neutre',
        'Interaction agréable ou positive',
      ],
      levelLabels: PERSON_TONE_LEVEL_LABELS,
    },
  ];
}

export function buildCustomSignalQuestion(signal: CustomSignal): BankQuestion {
  return {
    key: customSignalKey(signal.id),
    category: 'custom',
    construct: constructOfCustomSignal(signal),
    type: 'noul',
    label: signal.label,
    instructions: signal.question,
  };
}

function buildSubjectQuestions(subject: TrackedSubject): BankQuestion[] {
  switch (subject.kind) {
    case 'ANIMAL':
      return buildAnimalQuestionBank(subject);
    case 'OTHER_PERSON':
      return buildObservedQuestionBank();
    default:
      return STATIC_QUESTION_BANK;
  }
}

/**
 * The full list of questions for one note: the bank of the tracked subject, two questions per
 * configured person and one per custom signal.
 */
export function buildQuestionBank(context: SignalContext): BankQuestion[] {
  return [
    ...buildSubjectQuestions(context.subject),
    ...context.people.flatMap((person) =>
      buildPersonQuestions(person, context.subject),
    ),
    ...context.customSignals.map(buildCustomSignalQuestion),
  ];
}
