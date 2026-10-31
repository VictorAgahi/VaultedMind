import type { SignalContext } from './signal-context.js';
import { buildQuestionBank } from './question-bank.js';

export type CorrectionsInput = Record<string, number | null>;

/**
 * Returns the problems found in a corrections request, empty when it is valid.
 * Keys must belong to the question bank (or to a configured person) and values must be in range.
 */
export function validateCorrections(
  corrections: CorrectionsInput,
  context: SignalContext,
): string[] {
  const questions = new Map(
    buildQuestionBank(context).map((question) => [question.key, question]),
  );
  const problems: string[] = [];

  for (const [key, value] of Object.entries(corrections)) {
    const question = questions.get(key);
    if (!question) {
      problems.push(`Unknown signal key: ${key}`);
      continue;
    }
    if (value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      problems.push(`Invalid value for ${key}`);
      continue;
    }
    const max = question.type === 'noul' ? 1 : question.criteria.length - 1;
    if (value < 0 || value > max) {
      problems.push(`Value for ${key} must be between 0 and ${max}`);
    }
  }
  return problems;
}

/** Applies a request on top of the existing corrections: null removes an override. */
export function mergeCorrections(
  existing: Record<string, number>,
  incoming: CorrectionsInput,
): Record<string, number> {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged;
}
