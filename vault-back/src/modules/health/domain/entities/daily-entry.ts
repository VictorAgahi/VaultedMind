import type { FieldValueSource } from './field-value.entity.js';

export interface DailyEntryValue {
  customFieldId: string;
  value: string;
  subValues?: Record<string, string>;
  /** 'agent' when the value is an accepted autofill proposal; absent means manual. */
  source?: FieldValueSource;
}

/**
 * Everything the user records for one day, persisted atomically.
 */
export interface DailyEntry {
  userId: string;
  logId?: string;
  logDate: string;
  notes?: string;
  values: DailyEntryValue[];
  clearedFieldIds: string[];
}
