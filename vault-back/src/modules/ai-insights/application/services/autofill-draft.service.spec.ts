import { jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { AutofillDraftService } from './autofill-draft.service.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import { DEFAULT_USER_PREFERENCES } from '../../../user/domain/entities/user.entity.js';
import type { UserPreferences } from '../../../user/domain/entities/user.entity.js';
import { AIConsentRequiredException } from '../../domain/exceptions/ai-consent-required.exception.js';
import { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import type { AutofillMode } from '../../../health/domain/entities/custom-field.entity.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import { autofillPropertyName } from '../../../health/domain/services/autofill-schema.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';
import type { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import type {
  AIChatUsageRepository,
  AIUsageReservation,
} from '../../../../database/repositories/ai-chat-usage.repository.js';
import type { LLMService } from './llm.service.js';

const buildUser = (
  options: {
    consented?: boolean;
    aiEnabled?: boolean;
    preferences?: Partial<UserPreferences>;
  } = {},
): User =>
  new User(
    'user-1',
    'u@test.com',
    'hash',
    new Date(),
    new Date(),
    options.aiEnabled ?? true,
    undefined,
    false,
    undefined,
    { ...DEFAULT_USER_PREFERENCES, ...options.preferences },
    { aiConsentAt: options.consented === false ? undefined : new Date() },
  );

const buildField = (
  id: string,
  name: string,
  construct: string,
  overrides: Partial<{
    fieldType: FieldType;
    autofillMode: AutofillMode;
    isActive: boolean;
  }> = {},
): CustomField =>
  new CustomField(
    id,
    'user-1',
    name,
    overrides.fieldType ?? FieldType.NUMBER,
    overrides.isActive ?? true,
    new Date(),
    new Date(),
    undefined,
    undefined,
    false,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    construct,
    undefined,
    undefined,
    overrides.autofillMode ?? 'AUTO',
  );

const TEXT =
  "J'ai dormi six heures et demie et pris deux cafés. Je suis anxieux.";

describe('AutofillDraftService', () => {
  const sleep = buildField('sleep', 'Sommeil', 'sleep');
  const coffee = buildField('coffee', 'Cafés', 'substances');
  const mood = buildField('mood', 'Humeur', 'mood');
  const targeted = buildField('target', 'Cible', 'sleep');

  let userRepository: { findUserById: jest.Mock<() => Promise<User>> };
  let fieldRepository: {
    findByUserId: jest.Mock<() => Promise<CustomField[]>>;
  };
  let usageRepository: {
    tryReserve: jest.Mock<() => Promise<AIUsageReservation>>;
    release: jest.Mock<(id: string | null) => Promise<void>>;
  };
  let llmService: {
    generateStructured: jest.Mock<
      (prompt: string, config: { schema: object }) => Promise<string>
    >;
    getMiniModel: jest.Mock<() => string>;
  };
  let service: AutofillDraftService;

  const reply = (
    entries: Record<
      string,
      { value: string | number | boolean | null; quote: string | null }
    >,
  ): string =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(entries).map(([id, answer]) => [
          autofillPropertyName(id),
          answer,
        ]),
      ),
    );

  beforeEach(() => {
    userRepository = {
      findUserById: jest
        .fn<() => Promise<User>>()
        .mockResolvedValue(buildUser()),
    };
    fieldRepository = {
      findByUserId: jest
        .fn<() => Promise<CustomField[]>>()
        .mockResolvedValue([sleep, coffee, mood]),
    };
    usageRepository = {
      tryReserve: jest
        .fn<() => Promise<AIUsageReservation>>()
        .mockResolvedValue({
          usageId: 'usage-1',
          status: {
            count: 1,
            maxAllowed: 30,
            remaining: 29,
            nextAvailableAt: null,
            cooldownRemainingMs: 0,
          },
        }),
      release: jest
        .fn<(id: string | null) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    llmService = {
      generateStructured: jest.fn(),
      getMiniModel: jest.fn<() => string>().mockReturnValue('mini'),
    };
    service = new AutofillDraftService(
      userRepository as unknown as UserRepository,
      fieldRepository as unknown as CustomFieldRepository,
      usageRepository as unknown as AIChatUsageRepository,
      llmService as unknown as LLMService,
    );
  });

  it('should only ask about eligible fields and keep verified proposals', async () => {
    // Arrange
    llmService.generateStructured.mockResolvedValue(
      reply({
        sleep: { value: 6.5, quote: 'dormi six heures et demie' },
        coffee: { value: 2, quote: 'deux cafés' },
      }),
    );

    // Act
    const draft = await service.draft('user-1', TEXT, '2026-10-31');

    // Assert
    expect(draft.proposals).toEqual([
      { fieldId: 'sleep', value: '6.5', quote: 'dormi six heures et demie' },
      { fieldId: 'coffee', value: '2', quote: 'deux cafés' },
    ]);
    expect(draft.skippedFieldIds).toEqual(['mood']);
    const [prompt, config] = llmService.generateStructured.mock.calls[0];
    expect(prompt).toContain('Sommeil');
    expect(prompt).not.toContain('Humeur');
    expect(
      Object.keys((config.schema as { properties: object }).properties),
    ).toEqual([autofillPropertyName('sleep'), autofillPropertyName('coffee')]);
  });

  it('should drop proposals for non-eligible fields, invented quotes and invalid values', async () => {
    // Arrange
    llmService.generateStructured.mockResolvedValue(
      reply({
        sleep: { value: 6.5, quote: 'dormi sept heures' },
        coffee: { value: 'beaucoup', quote: 'deux cafés' },
        mood: { value: 2, quote: 'Je suis anxieux' },
      }),
    );

    // Act
    const draft = await service.draft('user-1', TEXT, '2026-10-31');

    // Assert
    expect(draft.proposals).toEqual([]);
  });

  it('should exclude insight targets and an OFF field from the request', async () => {
    // Arrange
    const off = buildField('off', 'Désactivé', 'sleep', {
      autofillMode: 'OFF',
    });
    fieldRepository.findByUserId.mockResolvedValue([sleep, targeted, off]);
    userRepository.findUserById.mockResolvedValue(
      buildUser({
        preferences: {
          insightTargets: [{ fieldId: 'target', direction: 'NEUTRAL' }],
        },
      }),
    );
    llmService.generateStructured.mockResolvedValue(reply({}));

    // Act
    const draft = await service.draft('user-1', TEXT, '2026-10-31');

    // Assert
    expect(draft.skippedFieldIds).toEqual(['target', 'off']);
    const [prompt] = llmService.generateStructured.mock.calls[0];
    expect(prompt).not.toContain('Cible');
    expect(prompt).not.toContain('Désactivé');
  });

  it('should not call the model nor reserve a usage when no field is eligible', async () => {
    // Arrange
    fieldRepository.findByUserId.mockResolvedValue([mood]);

    // Act
    const draft = await service.draft('user-1', TEXT, '2026-10-31');

    // Assert
    expect(draft).toEqual({ proposals: [], skippedFieldIds: ['mood'] });
    expect(usageRepository.tryReserve).not.toHaveBeenCalled();
    expect(llmService.generateStructured).not.toHaveBeenCalled();
  });

  it('should refuse without AI consent or without notes included', async () => {
    // Arrange
    userRepository.findUserById.mockResolvedValueOnce(
      buildUser({ consented: false }),
    );
    userRepository.findUserById.mockResolvedValueOnce(
      buildUser({ preferences: { aiIncludeNotes: false } }),
    );

    // Act / Assert
    await expect(
      service.draft('user-1', TEXT, '2026-10-31'),
    ).rejects.toBeInstanceOf(AIConsentRequiredException);
    await expect(
      service.draft('user-1', TEXT, '2026-10-31'),
    ).rejects.toBeInstanceOf(AIConsentRequiredException);
    expect(llmService.generateStructured).not.toHaveBeenCalled();
  });

  it('should answer 429 when the daily budget is spent', async () => {
    // Arrange
    usageRepository.tryReserve.mockResolvedValue({
      usageId: null,
      status: {
        count: 30,
        maxAllowed: 30,
        remaining: 0,
        nextAvailableAt: new Date(),
        cooldownRemainingMs: 3_600_000,
      },
    });

    // Act / Assert
    await expect(
      service.draft('user-1', TEXT, '2026-10-31'),
    ).rejects.toMatchObject({
      status: 429,
    });
    expect(llmService.generateStructured).not.toHaveBeenCalled();
  });

  it('should release the reservation when the model fails or replies with garbage', async () => {
    // Arrange
    llmService.generateStructured.mockRejectedValueOnce(new Error('boom'));
    llmService.generateStructured.mockResolvedValueOnce('not json');

    // Act / Assert
    await expect(
      service.draft('user-1', TEXT, '2026-10-31'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      service.draft('user-1', TEXT, '2026-10-31'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(usageRepository.release).toHaveBeenCalledTimes(2);
    expect(usageRepository.release).toHaveBeenCalledWith('usage-1');
  });

  it('should pseudonymize people before sending and drop quotes that contain an alias', async () => {
    // Arrange
    userRepository.findUserById.mockResolvedValue(
      buildUser({
        preferences: {
          people: [{ id: 'p1', alias: 'Personne A', variants: ['Marie'] }],
        },
      }),
    );
    const text = 'Avec Marie, deux cafés ce matin.';
    llmService.generateStructured.mockResolvedValue(
      reply({
        sleep: { value: 1, quote: 'Avec [Personne A]' },
        coffee: { value: 2, quote: 'deux cafés' },
      }),
    );

    // Act
    const draft = await service.draft('user-1', text, '2026-10-31');

    // Assert
    const [prompt] = llmService.generateStructured.mock.calls[0];
    expect(prompt).not.toContain('Marie');
    expect(prompt).toContain('[Personne A]');
    expect(draft.proposals).toEqual([
      { fieldId: 'coffee', value: '2', quote: 'deux cafés' },
    ]);
  });
});
