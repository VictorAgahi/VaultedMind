import type { JevQuestions, JevResponse } from './jev-types.js';
import {
  computeLinguisticMarkers,
  type LinguisticMarkers,
} from './linguistic-markers.js';
import {
  buildQuestionBank,
  questionBankVersion,
  type BankQuestion,
} from './question-bank.js';
import type { SignalContext } from './signal-context.js';
import type { SignalPayload } from './signal-payload.js';
import { isSelfSubject } from './tracked-subject.js';

export const SIGNALS_HASH_PURPOSE = 'note-signals-source';

export function buildJevQuestions(context: SignalContext): JevQuestions {
  const questions: JevQuestions = {};
  for (const question of buildQuestionBank(context)) {
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

/** Only the note length is kept for another subject: the ratios would describe the observer. */
function markersFor(
  context: SignalContext,
  rawNotes: string,
): LinguisticMarkers {
  const markers = computeLinguisticMarkers(rawNotes);
  return isSelfSubject(context.subject)
    ? markers
    : { ...markers, absolutistRatio: 0, firstPersonRatio: 0 };
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
  context: SignalContext,
  rawNotes: string,
): SignalPayload {
  const answers: SignalPayload['answers'] = {};
  for (const question of buildQuestionBank(context)) {
    const mapped = mapAnswer(question, response);
    if (mapped) answers[question.key] = mapped;
  }
  return {
    model: response.model,
    answers,
    // First-person and absolutist wording only says something about the author's own state
    markers: markersFor(context, rawNotes),
  };
}

/**
 * The text a signals row is bound to: raw notes, question bank version, people configuration,
 * and for another subject or custom signals what shapes the questions. Any change makes the
 * stored signals stale. For a default context the text is the one of the first bank version.
 */
export function buildSignalsSourceInput(
  rawNotes: string,
  context: SignalContext,
): string {
  const { subject, people, customSignals } = context;
  return JSON.stringify({
    notes: rawNotes,
    bank: questionBankVersion(subject.kind),
    people: people.map(({ id, alias, variants }) => ({ id, alias, variants })),
    ...(!isSelfSubject(subject) && {
      subject: { name: subject.name ?? null, species: subject.species ?? null },
    }),
    ...(customSignals.length > 0 && {
      custom: customSignals.map(({ id, label, question }) => ({
        id,
        label,
        question,
      })),
    }),
  });
}
