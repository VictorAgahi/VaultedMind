import type { FieldValueSource } from '../entities/field-value.entity.js';

/** What a backfill needs to know about the value a field already has on a day. */
export interface ExistingFieldValue {
  source?: FieldValueSource | null;
}

/**
 * A past day is filled from the health data only when the field is empty that day or holds
 * a value the sync wrote itself: a value the user typed, or an accepted autofill proposal,
 * is never overwritten.
 */
export function canFillFromHealth(
  existing: ExistingFieldValue | null,
): boolean {
  return !existing || existing.source === 'health';
}
