/**
 * A daily log whose raw notes need a (new) signals extraction.
 */
export interface SignalCandidate {
  dailyLogId: string;
  userId: string;
  notes: string;
  sourceHash: string;
  /** Existing row state, null when the note was never analysed. */
  row: {
    sourceHash: string;
    failureCount: number;
    corrections: string | null;
  } | null;
}
