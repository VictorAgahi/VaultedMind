import type {
  UserConsents,
  UserPreferences,
} from '../../domain/entities/user.entity.js';
import type { Person } from '../../../signals/domain/person.js';
import type { CustomSignalInput } from '../../../signals/domain/custom-signal.js';
import type { TrackedSubject } from '../../../signals/domain/tracked-subject.js';
import type { InsightTarget } from '../../../patterns/domain/insight-target.js';
import type { AppleWatchMetric } from '../../../health/domain/enums/apple-watch-metric.enum.js';
import type { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import type {
  GoalDirection,
  SubFieldDefinition,
} from '../../../health/domain/entities/custom-field.entity.js';

export interface RegistrationDetails {
  firstName?: string;
  healthDataConsentAt?: Date;
}

export type PublicUserPreferences = Omit<
  UserPreferences,
  'firstName' | 'lastReminderOn' | 'patternObviousOverrides' | 'customSignals'
> & { customSignals: CustomSignalInput[] };

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  createdAt: Date;
  preferences: PublicUserPreferences;
  consents: UserConsents;
  aiInsightsEnabled: boolean;
}

export interface UserPreferencesUpdate {
  firstName?: string | null;
  reminderEnabled?: boolean;
  reminderTime?: string;
  timezone?: string;
  quickCheckinFieldId?: string | null;
  aiIncludeNotes?: boolean;
  insightsV2Enabled?: boolean;
  people?: Person[];
  trackedSubject?: TrackedSubject;
  customSignals?: CustomSignalInput[];
  insightTargets?: InsightTarget[];
}

interface ExportedCustomField {
  id: string;
  name: string;
  fieldType: FieldType;
  isActive: boolean;
  category?: string;
  optionsOrder?: string[];
  subFields?: SubFieldDefinition[];
  min?: number;
  max?: number;
  rememberLastValue: boolean;
  appleWatchMetric?: AppleWatchMetric;
  goalTarget?: number;
  goalDirection?: GoalDirection;
  createdAt: Date;
}

interface ExportedDailyLog {
  id: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  values: {
    fieldId: string;
    value: string;
    subValues?: Record<string, string>;
  }[];
}

interface ExportedInsight {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: Date;
}

export interface UserDataExport {
  exportedAt: string;
  format: string;
  user: {
    email: string;
    firstName?: string;
    createdAt: Date;
    preferences: UserPreferences;
    consents: UserConsents;
    aiInsightsEnabled: boolean;
    aiContext?: string;
  };
  customFields: ExportedCustomField[];
  dailyLogs: ExportedDailyLog[];
  aiInsights: ExportedInsight[];
  notifications: { endpoint: string; createdAt: Date }[];
}
