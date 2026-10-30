/**
 * A clean rewrite is only valid for the exact raw notes it was produced from.
 * `cleanSource` is the keyed hash of those raw notes; any edit changes the hash and makes the rewrite stale.
 */
export function isCleanNotesFresh(
  rawNotes: string | null | undefined,
  cleanSource: string | null | undefined,
  hashOf: (text: string) => string,
): boolean {
  if (!rawNotes?.trim() || !cleanSource) return false;
  return hashOf(rawNotes) === cleanSource;
}
