export const MAX_SIGNAL_FAILURES = 3;

export interface SignalRowState {
  sourceHash: string;
  hasPayload: boolean;
  failureCount: number;
}

export type ExtractionDecision = 'extract' | 'fresh' | 'give-up';

/**
 * Decides whether a note needs a new extraction.
 * A changed source hash always restarts the process, even after repeated failures.
 */
export function decideExtraction(
  row: SignalRowState | null,
  expectedHash: string,
): ExtractionDecision {
  if (!row || row.sourceHash !== expectedHash) return 'extract';
  if (row.hasPayload) return 'fresh';
  return row.failureCount >= MAX_SIGNAL_FAILURES ? 'give-up' : 'extract';
}

/** Failure count after a new failure: counting restarts when the source changed. */
export function nextFailureCount(
  row: Pick<SignalRowState, 'sourceHash' | 'failureCount'> | null,
  expectedHash: string,
): number {
  return row && row.sourceHash === expectedHash ? row.failureCount + 1 : 1;
}
