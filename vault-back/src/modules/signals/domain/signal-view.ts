import type { Person } from './person.js';
import type { SignalContext } from './signal-context.js';
import {
  PERSON_TONE_LEVEL_LABELS,
  buildQuestionBank,
  personPresentKey,
  personToneKey,
  type BankQuestion,
  type QuestionCategory,
  type QuestionType,
} from './question-bank.js';
import type { SignalCorrections, SignalPayload } from './signal-payload.js';

export const DISPLAY_NOUL_THRESHOLD = 0.7;
export const DISPLAY_CONFIDENCE_THRESHOLD = 0.5;
export const HIGH_LEVEL_THRESHOLD = 3;
export const LOW_LEVEL_THRESHOLD = 1;
/** Neutral level used to dismiss a signal whose low end is the notable one. */
const NEUTRAL_LEVEL = 2;

export interface SignalView {
  key: string;
  category: QuestionCategory;
  label: string;
  type: QuestionType;
  value: number;
  confidence?: number;
  levelLabel?: string;
  /** Score only: every level label, low to high, to let the user pick a level. */
  levelLabels?: string[];
  /** Person present signals only: tone of the interaction when it is reliable enough. */
  toneLabel?: string | null;
  corrected: boolean;
  displayed: boolean;
  /** Correction value that removes the signal from the displayed ones. */
  dismissValue: number;
}

function levelIndex(question: BankQuestion, value: number): number {
  if (question.type !== 'score') return 0;
  const last = question.criteria.length - 1;
  return Math.min(last, Math.max(0, Math.round(value)));
}

function isScoreDisplayed(
  question: BankQuestion,
  value: number,
  confidence: number,
): boolean {
  if (confidence < DISPLAY_CONFIDENCE_THRESHOLD) return false;
  const level = levelIndex(question, value);
  const lowEndIsNotable =
    question.type === 'score' && question.lowEndIsNotable === true;
  return lowEndIsNotable
    ? level <= LOW_LEVEL_THRESHOLD
    : level >= HIGH_LEVEL_THRESHOLD;
}

interface ResolvedAnswer {
  value: number;
  confidence?: number;
  corrected: boolean;
}

function resolveAnswer(
  key: string,
  payload: SignalPayload,
  corrections: SignalCorrections,
): ResolvedAnswer | null {
  const correction = corrections[key];
  if (correction !== undefined) {
    return { value: correction, confidence: 1, corrected: true };
  }
  const answer = payload.answers[key];
  return answer
    ? { value: answer.value, confidence: answer.confidence, corrected: false }
    : null;
}

function toneLabelFor(
  person: Person,
  payload: SignalPayload,
  corrections: SignalCorrections,
  isPresent: boolean,
): string | null {
  if (!isPresent) return null;
  const tone = resolveAnswer(personToneKey(person.id), payload, corrections);
  if (!tone || (tone.confidence ?? 0) < DISPLAY_CONFIDENCE_THRESHOLD) {
    return null;
  }
  const last = PERSON_TONE_LEVEL_LABELS.length - 1;
  return PERSON_TONE_LEVEL_LABELS[
    Math.min(last, Math.max(0, Math.round(tone.value)))
  ];
}

function buildView(
  question: BankQuestion,
  resolved: ResolvedAnswer,
  people: Person[],
  payload: SignalPayload,
  corrections: SignalCorrections,
): SignalView {
  const base = {
    key: question.key,
    category: question.category,
    label: question.label,
    corrected: resolved.corrected,
  };

  if (question.type === 'noul') {
    const isPresent = resolved.value >= DISPLAY_NOUL_THRESHOLD;
    const person =
      question.category === 'person'
        ? people.find((p) => personPresentKey(p.id) === question.key)
        : undefined;
    return {
      ...base,
      type: 'noul',
      value: resolved.value,
      ...(person && {
        toneLabel: toneLabelFor(person, payload, corrections, isPresent),
      }),
      displayed: isPresent,
      dismissValue: 0,
    };
  }

  const confidence = resolved.confidence ?? 0;
  const displayed =
    // A tone alone is never a chip: it only qualifies the person present signal
    question.category !== 'person' &&
    isScoreDisplayed(question, resolved.value, confidence);
  return {
    ...base,
    type: 'score',
    value: resolved.value,
    confidence,
    levelLabel: question.levelLabels[levelIndex(question, resolved.value)],
    levelLabels: question.levelLabels,
    displayed,
    dismissValue: question.lowEndIsNotable ? NEUTRAL_LEVEL : 0,
  };
}

/**
 * Turns stored signals and user corrections into what the API serves.
 * Corrections override the model value; questions Jev did not answer are left out unless corrected.
 */
export function buildSignalViews(
  payload: SignalPayload,
  corrections: SignalCorrections,
  context: SignalContext,
): SignalView[] {
  const views: SignalView[] = [];
  const { people } = context;
  for (const question of buildQuestionBank(context)) {
    const resolved = resolveAnswer(question.key, payload, corrections);
    if (!resolved) continue;
    views.push(buildView(question, resolved, people, payload, corrections));
  }
  return views;
}
