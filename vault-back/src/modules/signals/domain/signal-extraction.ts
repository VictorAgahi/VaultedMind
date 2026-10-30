import type { JevQuestions, JevResponse } from './jev-types.js';
import { computeLinguisticMarkers } from './linguistic-markers.js';
import type { Person } from './person.js';
import {
  QUESTION_BANK_VERSION,
  buildQuestionBank,
  type BankQuestion,
} from './question-bank.js';
import type { SignalPayload } from './signal-payload.js';

export const SIGNALS_HASH_PURPOSE = 'note-signals-source';

export function buildJevQuestions(people: Person[]): JevQuestions {
  const questions: JevQuestions = {};
  for (const question of buildQuestionBank(people)) {
    questions[question.key] =
      question.type === 'noul'
        ? { type: 'noul', instructions: question.instructions }
        : {
            type: 'score',
            instructions: question.instructions,
            criteria: question.criteria,
          };
  }
  return questions;
}

function isProbability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function mapAnswer(
  question: BankQuestion,
  response: JevResponse,
): SignalPayload['answers'][string] | null {
  const answer = response.answers[question.key];
  if (!answer || answer.type !== question.type) return null;

  if (answer.type === 'noul') {
    return isProbability(answer.noul) ? { value: answer.noul } : null;
  }
  if (question.type !== 'score') return null;
  const maxLevel = question.criteria.length - 1;
  if (
    !Number.isFinite(answer.score) ||
    answer.score < 0 ||
    answer.score > maxLevel
  ) {
    return null;
  }
  return {
    value: answer.score,
    confidence: isProbability(answer.confidence) ? answer.confidence : 0,
  };
}

/**
 * Maps Jev's answers to the stored payload. Missing or malformed answers are left out
 * so that one bad answer never discards the others.
 */
export function mapResponseToPayload(
  response: JevResponse,
  people: Person[],
  rawNotes: string,
): SignalPayload {
  const answers: SignalPayload['answers'] = {};
  for (const question of buildQuestionBank(people)) {
    const mapped = mapAnswer(question, response);
    if (mapped) answers[question.key] = mapped;
  }
  return {
    model: response.model,
    answers,
    markers: computeLinguisticMarkers(rawNotes),
  };
}

/**
 * The text a signals row is bound to: raw notes, question bank version and people configuration.
 * Any change makes the stored signals stale.
 */
export function buildSignalsSourceInput(
  rawNotes: string,
  people: Person[],
): string {
  return JSON.stringify({
    notes: rawNotes,
    bank: QUESTION_BANK_VERSION,
    people: people.map(({ id, alias, variants }) => ({ id, alias, variants })),
  });
}
