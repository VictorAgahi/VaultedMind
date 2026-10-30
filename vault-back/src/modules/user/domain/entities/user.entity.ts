/**
 * Preferences the user controls from the app (reminders, quick check-in, AI scope).
 */
export interface UserPreferences {
  firstName?: string;
  reminderEnabled: boolean;
  /** Local time of the daily reminder, "HH:MM". */
  reminderTime: string;
  /** IANA time zone used to compute the user's local day and reminder time. */
  timezone: string;
  quickCheckinFieldId?: string;
  /** Whether free-text notes may be sent to the AI provider. */
  aiIncludeNotes: boolean;
  /** Local date ("YYYY-MM-DD") of the last reminder sent, to send at most one per day. */
  lastReminderOn?: string;
}

/**
 * Explicit, timestamped consents required by GDPR art. 9 for health data.
 */
export interface UserConsents {
  healthDataConsentAt?: Date;
  aiConsentAt?: Date;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  reminderEnabled: true,
  reminderTime: '21:00',
  timezone: 'Europe/Paris',
  aiIncludeNotes: true,
};

/**
 * Pure Domain Entity for User.
 * No framework decorators here.
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public aiInsightsEnabled: boolean = false,
    public aiContext?: string,
    public isGeneratingInsights: boolean = false,
    public readonly deletedAt?: Date,
    public preferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES },
    public consents: UserConsents = {},
  ) {}

  /**
   * Domain logic example: check if user is deleted.
   */
  public isDeleted(): boolean {
    return !!this.deletedAt;
  }

  public hasGivenAIConsent(): boolean {
    return !!this.consents.aiConsentAt;
  }
}
