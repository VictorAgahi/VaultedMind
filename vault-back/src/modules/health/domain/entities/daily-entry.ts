export interface DailyEntryValue {
  customFieldId: string;
  value: string;
  subValues?: Record<string, string>;
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
