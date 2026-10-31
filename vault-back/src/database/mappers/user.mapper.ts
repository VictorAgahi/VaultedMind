import { Injectable } from '@nestjs/common';
import { User } from '../../modules/user/domain/entities/user.entity.js';
import { UserModel } from '../models/user.model.js';
import type { Person } from '../../modules/signals/domain/person.js';
import type { CustomSignal } from '../../modules/signals/domain/custom-signal.js';
import {
  DEFAULT_TRACKED_SUBJECT,
  isSelfSubject,
  normalizeTrackedSubject,
  type TrackedSubject,
} from '../../modules/signals/domain/tracked-subject.js';
import { EncryptionService } from '../../common/security/encryption.service.js';

@Injectable()
export class UserMapper {
  constructor(private readonly encryptionService: EncryptionService) {}

  public toDomain(model: UserModel): User {
    // Decrypt email for the domain
    const plainEmail = this.encryptionService.decrypt(model.emailEncrypted);
    const firstName = model.firstNameEncrypted
      ? this.encryptionService.decrypt(model.firstNameEncrypted)
      : undefined;

    return new User(
      model.id,
      plainEmail,
      model.passwordHash,
      model.createdAt,
      model.updatedAt,
      model.aiInsightsEnabled,
      model.aiContext,
      model.isGeneratingInsights,
      model.deletedAt,
      {
        firstName,
        reminderEnabled: model.reminderEnabled ?? true,
        reminderTime: model.reminderTime ?? '21:00',
        timezone: model.timezone ?? 'Europe/Paris',
        quickCheckinFieldId: model.quickCheckinFieldId ?? undefined,
        aiIncludeNotes: model.aiIncludeNotes ?? true,
        insightsV2Enabled: model.insightsV2Enabled ?? false,
        people: this.decryptPeople(model.peopleEncrypted),
        trackedSubject: this.decryptTrackedSubject(
          model.trackedSubjectEncrypted,
        ),
        customSignals: this.decryptCustomSignals(model.customSignalsEncrypted),
        insightTargets: model.insightTargets ?? [],
        patternObviousOverrides: model.patternObviousOverrides ?? {},
        lastReminderOn: model.lastReminderOn ?? undefined,
      },
      {
        healthDataConsentAt: model.healthDataConsentAt ?? undefined,
        aiConsentAt: model.aiConsentAt ?? undefined,
      },
    );
  }

  private decryptPeople(encrypted?: string | null): Person[] {
    if (!encrypted) return [];
    try {
      return JSON.parse(this.encryptionService.decrypt(encrypted)) as Person[];
    } catch {
      return [];
    }
  }

  private decryptTrackedSubject(encrypted?: string | null): TrackedSubject {
    if (!encrypted) return DEFAULT_TRACKED_SUBJECT;
    try {
      return normalizeTrackedSubject(
        JSON.parse(
          this.encryptionService.decrypt(encrypted),
        ) as Partial<TrackedSubject>,
      );
    } catch {
      return DEFAULT_TRACKED_SUBJECT;
    }
  }

  private decryptCustomSignals(encrypted?: string | null): CustomSignal[] {
    if (!encrypted) return [];
    try {
      return JSON.parse(
        this.encryptionService.decrypt(encrypted),
      ) as CustomSignal[];
    } catch {
      return [];
    }
  }

  /** Encrypted custom signals column value, null when there are none. */
  public encryptCustomSignals(signals: CustomSignal[]): string | null {
    return signals.length > 0
      ? this.encryptionService.encrypt(JSON.stringify(signals))
      : null;
  }

  public toPersistence(entity: User): UserModel {
    const model = new UserModel();
    model.id = entity.id;

    // Encrypt email and create blind index for persistence
    model.emailEncrypted = this.encryptionService.encrypt(entity.email);
    model.emailIndex = this.encryptionService.createBlindIndex(entity.email);

    model.passwordHash = entity.passwordHash;
    model.aiInsightsEnabled = entity.aiInsightsEnabled;
    model.aiContext = entity.aiContext;
    model.isGeneratingInsights = entity.isGeneratingInsights;
    model.firstNameEncrypted = entity.preferences.firstName
      ? this.encryptionService.encrypt(entity.preferences.firstName)
      : null;
    model.reminderEnabled = entity.preferences.reminderEnabled;
    model.reminderTime = entity.preferences.reminderTime;
    model.timezone = entity.preferences.timezone;
    model.quickCheckinFieldId = entity.preferences.quickCheckinFieldId ?? null;
    model.aiIncludeNotes = entity.preferences.aiIncludeNotes;
    model.insightsV2Enabled = entity.preferences.insightsV2Enabled;
    const people = entity.preferences.people ?? [];
    const insightTargets = entity.preferences.insightTargets ?? [];
    model.peopleEncrypted =
      people.length > 0
        ? this.encryptionService.encrypt(JSON.stringify(people))
        : null;
    const trackedSubject = entity.preferences.trackedSubject;
    model.trackedSubjectEncrypted =
      trackedSubject && !isSelfSubject(trackedSubject)
        ? this.encryptionService.encrypt(JSON.stringify(trackedSubject))
        : null;
    model.customSignalsEncrypted = this.encryptCustomSignals(
      entity.preferences.customSignals ?? [],
    );
    model.insightTargets = insightTargets.length > 0 ? insightTargets : null;
    const obviousOverrides = entity.preferences.patternObviousOverrides ?? {};
    model.patternObviousOverrides =
      Object.keys(obviousOverrides).length > 0 ? obviousOverrides : null;
    model.lastReminderOn = entity.preferences.lastReminderOn ?? null;
    model.healthDataConsentAt = entity.consents.healthDataConsentAt ?? null;
    model.aiConsentAt = entity.consents.aiConsentAt ?? null;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;
    return model;
  }
}
