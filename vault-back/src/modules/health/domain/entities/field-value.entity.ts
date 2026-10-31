/**
 * Where a saved value came from: 'agent' for an accepted autofill proposal, 'health' for a
 * value written by the Apple Health sync, null for a manual entry.
 */
export type FieldValueSource = 'agent' | 'health';
/** Sources the app may send with a saved entry: 'health' is only written by the server. */
export const FIELD_VALUE_SOURCES: FieldValueSource[] = ['agent'];

export class FieldValue {
  constructor(
    public readonly id: string,
    public readonly dailyLogId: string,
    public readonly customFieldId: string,
    public readonly value: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly subValues?: Record<string, string>,
    public readonly source?: FieldValueSource,
  ) {}
}
