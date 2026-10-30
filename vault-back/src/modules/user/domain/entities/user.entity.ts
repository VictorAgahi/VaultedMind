import type { Person } from '../../../signals/domain/person.js';
import type { InsightTarget } from '../../../patterns/domain/insight-target.js';

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
  /** Opt-in to the advanced journal analysis (clean rewrite of dictated notes, beta). */
  insightsV2Enabled: boolean;
  /** People from the user's life, replaced by their alias before notes leave the server. */
  people: Person[];
  /** Up to 6 targets (a field, or a value of a text field) the user wants to understand, with the good direction of each. */
  insightTargets: InsightTarget[];
  /** Finding key to the user's own verdict on whether a link is obvious; beats the AI score. */
  patternObviousOverrides: Record<string, boolean>;
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
  insightsV2Enabled: false,
  people: [],
  insightTargets: [],
  patternObviousOverrides: {},
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

  /**
   * Notes may be sent to the AI provider only with consent and the notes scope accepted.
   */
  public allowsNotesInAI(): boolean {
    return this.hasGivenAIConsent() && this.preferences.aiIncludeNotes;
  }

  /**
   * The clean rewrite of dictated notes needs the v2 opt-in and the right to send notes to the AI.
   */
  public canCleanNotes(): boolean {
    return this.preferences.insightsV2Enabled && this.allowsNotesInAI();
  }
}
