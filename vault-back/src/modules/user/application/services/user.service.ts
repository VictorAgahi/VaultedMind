import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  RegistrationDetails,
  UserPreferencesUpdate,
  UserProfile,
  UserDataExport,
} from '../types/user-profile.types.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import {
  User,
  DEFAULT_USER_PREFERENCES,
} from '../../domain/entities/user.entity.js';
import type { Person } from '../../../signals/domain/person.js';
import {
  findCustomSignalProblems,
  mergeCustomSignals,
  toCustomSignalInput,
} from '../../../signals/domain/custom-signal.js';
import { normalizeTrackedSubject } from '../../../signals/domain/tracked-subject.js';
import { findTargetProblems } from '../../../patterns/domain/insight-target.js';
import { AIConsentRequiredException } from '../../../ai-insights/domain/exceptions/ai-consent-required.exception.js';
import { AIInsightRepository } from '../../../../database/repositories/ai-insight.repository.js';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { NotificationSubscriptionModel } from '../../../../database/models/notification-subscription.model.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionService: EncryptionService,
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly aiInsightRepository: AIInsightRepository,
    @InjectRepository(NotificationSubscriptionModel)
    private readonly subscriptionRepository: Repository<NotificationSubscriptionModel>,
  ) {}

  async createUser(
    email: string,
    password: string,
    registration: RegistrationDetails = {},
  ): Promise<User> {
    const emailIndex = this.encryptionService.createBlindIndex(email);
    const existingUser = await this.userRepository.findByEmailIndex(emailIndex);

    if (existingUser) {
      this.logger.warn(`User creation failed: email already exists`);
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.encryptionService.hashPassword(password);

    const user = new User(
      uuidv4(),
      email,
      passwordHash,
      new Date(),
      new Date(),
      false,
      undefined,
      false,
      undefined,
      { ...DEFAULT_USER_PREFERENCES, firstName: registration.firstName },
      { healthDataConsentAt: registration.healthDataConsentAt },
    );

    const savedUser = await this.userRepository.saveUser(user);
    this.logger.log(`User created successfully with ID: ${savedUser.id}`);
    return savedUser;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findUserById(userId);
    return this.toProfile(user);
  }

  async updatePreferences(
    userId: string,
    updates: UserPreferencesUpdate,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findUserById(userId);
    if (updates.quickCheckinFieldId) {
      await this.assertFieldOwnership(userId, updates.quickCheckinFieldId);
    }
    if (updates.insightTargets) {
      await this.assertValidTargets(userId, updates.insightTargets);
    }
    const {
      firstName,
      quickCheckinFieldId,
      people,
      trackedSubject,
      customSignals,
      ...rest
    } = updates;
    if (customSignals) {
      const problems = findCustomSignalProblems(customSignals);
      if (problems.length > 0) throw new BadRequestException(problems);
    }
    // The validated DTO carries absent fields as undefined: they must not erase stored values
    const provided = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    user.preferences = {
      ...user.preferences,
      ...provided,
      ...(firstName !== undefined && {
        firstName: firstName?.trim() || undefined,
      }),
      ...(people !== undefined && { people: this.normalizePeople(people) }),
      ...(trackedSubject !== undefined && {
        trackedSubject: normalizeTrackedSubject(trackedSubject),
      }),
      ...(customSignals !== undefined && {
        customSignals: mergeCustomSignals(
          customSignals,
          user.preferences.customSignals,
        ),
      }),
      ...(quickCheckinFieldId !== undefined && {
        quickCheckinFieldId: quickCheckinFieldId ?? undefined,
      }),
    };
    if (updates.insightsV2Enabled && !user.allowsNotesInAI()) {
      throw new AIConsentRequiredException();
    }
    const saved = await this.userRepository.saveUser(user);
    return this.toProfile(saved);
  }

  private async assertValidTargets(
    userId: string,
    targets: NonNullable<UserPreferencesUpdate['insightTargets']>,
  ): Promise<void> {
    const fields = await this.customFieldRepository.findByUserId(userId);
    const problems = findTargetProblems(targets, fields);
    if (problems.length > 0) throw new BadRequestException(problems);
  }

  private normalizePeople(people: Person[]): Person[] {
    const normalized = people.map((person) => ({
      id: person.id,
      alias: person.alias.trim(),
      variants: [
        ...new Set(
          person.variants.map((variant) => variant.trim()).filter(Boolean),
        ),
      ],
    }));
    const invalid = normalized.some(
      (person) => !person.alias || person.variants.length === 0,
    );
    const duplicatedId =
      new Set(normalized.map((person) => person.id)).size !== normalized.length;
    if (invalid || duplicatedId) {
      throw new BadRequestException('Invalid people configuration');
    }
    return normalized;
  }

  private async assertFieldOwnership(
    userId: string,
    fieldId: string,
  ): Promise<void> {
    const fields = await this.customFieldRepository.findByUserId(userId);
    if (!fields.some((field) => field.id === fieldId)) {
      throw new NotFoundException(`Custom field with ID ${fieldId} not found`);
    }
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.preferences.firstName,
      createdAt: user.createdAt,
      preferences: {
        reminderEnabled: user.preferences.reminderEnabled,
        reminderTime: user.preferences.reminderTime,
        timezone: user.preferences.timezone,
        quickCheckinFieldId: user.preferences.quickCheckinFieldId,
        aiIncludeNotes: user.preferences.aiIncludeNotes,
        insightsV2Enabled: user.preferences.insightsV2Enabled,
        people: user.preferences.people,
        trackedSubject: user.preferences.trackedSubject,
        customSignals: user.preferences.customSignals.map(toCustomSignalInput),
        insightTargets: user.preferences.insightTargets,
      },
      consents: {
        healthDataConsentAt: user.consents.healthDataConsentAt,
        aiConsentAt: user.consents.aiConsentAt,
      },
      aiInsightsEnabled: user.aiInsightsEnabled,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    this.logger.log(`Hard deleting user with ID: ${userId}`);
    await this.userRepository.deleteUser(userId);
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    this.logger.log(`Exporting all data for user ID: ${userId}`);

    const user = await this.userRepository.findUserById(userId);
    const logs = await this.dailyLogRepository.findByUserId(userId);
    const customFields = await this.customFieldRepository.findByUserId(userId);
    const insights = await this.aiInsightRepository.findByUserId(userId, 10000);
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
    });

    return {
      exportedAt: new Date().toISOString(),
      format:
        "JSON lisible. Ce fichier n'est pas chiffré : conservez-le en lieu sûr.",
      user: {
        email: user.email,
        firstName: user.preferences.firstName,
        createdAt: user.createdAt,
        preferences: user.preferences,
        consents: user.consents,
        aiInsightsEnabled: user.aiInsightsEnabled,
        aiContext: user.aiContext,
      },
      customFields: customFields.map((cf) => ({
        id: cf.id,
        name: cf.name,
        fieldType: cf.fieldType,
        isActive: cf.isActive,
        category: cf.category,
        optionsOrder: cf.optionsOrder,
        subFields: cf.subFields,
        min: cf.min,
        max: cf.max,
        rememberLastValue: cf.rememberLastValue,
        appleWatchMetric: cf.appleWatchMetric,
        goalTarget: cf.goalTarget,
        goalDirection: cf.goalDirection,
        createdAt: cf.createdAt,
      })),
      dailyLogs: logs.map((log) => ({
        id: log.id,
        date: log.logDate,
        notes: log.notes,
        createdAt: log.createdAt,
        values: (log.fieldValues ?? []).map((fv) => ({
          fieldId: fv.customFieldId,
          value: fv.value,
          subValues: fv.subValues,
        })),
      })),
      aiInsights: insights.map((insight) => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        content: insight.content,
        createdAt: insight.createdAt,
      })),
      notifications: subscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
      })),
    };
  }
}
