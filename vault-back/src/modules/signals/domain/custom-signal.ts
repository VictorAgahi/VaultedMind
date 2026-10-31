import { OTHER_CONSTRUCT, isConstruct, type Construct } from './constructs.js';

export const CUSTOM_SIGNAL_KINDS = ['yes_no'] as const;
export type CustomSignalKind = (typeof CUSTOM_SIGNAL_KINDS)[number];

/**
 * A yes/no question about the day written by the user, asked to Jev on every note.
 */
export interface CustomSignal {
  id: string;
  /** Short name shown on chips and in sentences. */
  label: string;
  /** French yes/no question sent to Jev, phrased positively and specifically. */
  question: string;
  kind: CustomSignalKind;
  /** What the signal measures, classified once by Jev; "other" until then. */
  construct?: Construct;
  /** The label and question the construct was classified from, to detect an edit. */
  constructSource?: string;
}

/** What the API exposes and accepts: the internal classification stays on the server. */
export type CustomSignalInput = Pick<
  CustomSignal,
  'id' | 'label' | 'question' | 'kind'
>;

export const CUSTOM_SIGNAL_LIMITS = {
  maxSignals: 10,
  labelMinLength: 1,
  labelMaxLength: 40,
  questionMinLength: 5,
  questionMaxLength: 200,
} as const;

export const CUSTOM_SIGNAL_ID_PATTERN = /^[a-z0-9]{1,24}$/;
/** Characters that would let a question look like markup or a prompt delimiter. */
export const FORBIDDEN_QUESTION_CHARACTERS = /[<>{}[\]`]/;

export const CUSTOM_SIGNAL_KEY_PREFIX = 'custom_';

export function customSignalKey(signalId: string): string {
  return `${CUSTOM_SIGNAL_KEY_PREFIX}${signalId}`;
}

/** Text describing the signal to Jev for the construct classification; also its change detector. */
export function describeCustomSignal(
  signal: Pick<CustomSignal, 'label' | 'question'>,
): string {
  return `Nom du signal : ${signal.label.trim()}\nQuestion posée chaque jour : ${signal.question.trim()}`;
}

export function constructOfCustomSignal(signal: CustomSignal): Construct {
  return signal.construct && isConstruct(signal.construct)
    ? signal.construct
    : OTHER_CONSTRUCT;
}

/** Problems of a user-written signals list, empty when it is valid. */
export function findCustomSignalProblems(
  signals: CustomSignalInput[],
): string[] {
  const problems: string[] = [];
  if (signals.length > CUSTOM_SIGNAL_LIMITS.maxSignals) {
    problems.push(
      `At most ${CUSTOM_SIGNAL_LIMITS.maxSignals} custom signals are allowed`,
    );
  }
  if (new Set(signals.map((signal) => signal.id)).size !== signals.length) {
    problems.push('Custom signal ids must be distinct');
  }
  const labels = signals.map((signal) => signal.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) {
    problems.push('Custom signal labels must be distinct');
  }
  for (const signal of signals) {
    const label = signal.label.trim();
    const question = signal.question.trim();
    if (
      label.length < CUSTOM_SIGNAL_LIMITS.labelMinLength ||
      label.length > CUSTOM_SIGNAL_LIMITS.labelMaxLength
    ) {
      problems.push(`Invalid label for custom signal ${signal.id}`);
    }
    if (
      question.length < CUSTOM_SIGNAL_LIMITS.questionMinLength ||
      question.length > CUSTOM_SIGNAL_LIMITS.questionMaxLength
    ) {
      problems.push(`Invalid question for custom signal ${signal.id}`);
    }
    if (
      FORBIDDEN_QUESTION_CHARACTERS.test(question) ||
      FORBIDDEN_QUESTION_CHARACTERS.test(label)
    ) {
      problems.push(`Forbidden characters in custom signal ${signal.id}`);
    }
  }
  return problems;
}

/**
 * Applies an incoming list on top of the stored one: trimmed texts, and the stored
 * classification kept only for a signal whose label and question did not change.
 */
export function mergeCustomSignals(
  incoming: CustomSignalInput[],
  stored: CustomSignal[],
): CustomSignal[] {
  const storedById = new Map(stored.map((signal) => [signal.id, signal]));
  return incoming.map((signal): CustomSignal => {
    const label = signal.label.trim();
    const question = signal.question.trim();
    const previous = storedById.get(signal.id);
    const unchanged =
      previous !== undefined &&
      previous.constructSource === describeCustomSignal({ label, question });
    return {
      id: signal.id,
      label,
      question,
      kind: signal.kind,
      ...(unchanged &&
        previous.construct && {
          construct: previous.construct,
          constructSource: previous.constructSource,
        }),
    };
  });
}

export function toCustomSignalInput(signal: CustomSignal): CustomSignalInput {
  return {
    id: signal.id,
    label: signal.label,
    question: signal.question,
    kind: signal.kind,
  };
}

/** Signals never classified, or edited since. */
export function findSignalsToClassify(signals: CustomSignal[]): CustomSignal[] {
  return signals.filter(
    (signal) => signal.constructSource !== describeCustomSignal(signal),
  );
}
