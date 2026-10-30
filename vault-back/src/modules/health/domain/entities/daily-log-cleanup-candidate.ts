/**
 * A daily log whose raw notes have no up-to-date clean rewrite yet.
 */
export interface DailyLogCleanupCandidate {
  id: string;
  userId: string;
  notes: string;
}
