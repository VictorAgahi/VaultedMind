import type { CustomSignal } from './custom-signal.js';
import type { Person } from './person.js';
import {
  DEFAULT_TRACKED_SUBJECT,
  type TrackedSubject,
} from './tracked-subject.js';

/**
 * Everything that shapes the questions asked on a note: who is tracked, the people of the
 * entourage and the user's own signals.
 */
export interface SignalContext {
  subject: TrackedSubject;
  people: Person[];
  customSignals: CustomSignal[];
}

export function signalContext(
  parts: Partial<SignalContext> = {},
): SignalContext {
  return {
    subject: parts.subject ?? DEFAULT_TRACKED_SUBJECT,
    people: parts.people ?? [],
    customSignals: parts.customSignals ?? [],
  };
}

/** The context of a user, read from their preferences. */
export function signalContextOf(preferences: {
  trackedSubject?: TrackedSubject;
  people?: Person[];
  customSignals?: CustomSignal[];
}): SignalContext {
  return signalContext({
    subject: preferences.trackedSubject,
    people: preferences.people,
    customSignals: preferences.customSignals,
  });
}
