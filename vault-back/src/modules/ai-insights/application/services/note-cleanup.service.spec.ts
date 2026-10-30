import { jest } from '@jest/globals';
import { NoteCleanupService } from './note-cleanup.service.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';
import type { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import type { DailyLogCleanupCandidate } from '../../../health/domain/entities/daily-log-cleanup-candidate.js';
import type { LLMService } from './llm.service.js';

const buildUser = (
  id: string,
  options: {
    insightsV2Enabled?: boolean;
    aiIncludeNotes?: boolean;
    consented?: boolean;
  },
): User =>
  new User(
    id,
    `${id}@test.com`,
    'hash',
    new Date(),
    new Date(),
    false,
    undefined,
    false,
    undefined,
    {
      reminderEnabled: true,
      reminderTime: '21:00',
      timezone: 'Europe/Paris',
      aiIncludeNotes: options.aiIncludeNotes ?? true,
      insightsV2Enabled: options.insightsV2Enabled ?? true,
    },
    { aiConsentAt: options.consented === false ? undefined : new Date() },
  );

describe('User.canCleanNotes', () => {
  it('should allow cleanup with the flag, consent and notes included', () => {
    // Arrange
    const user = buildUser('u1', {});

    // Act
    const allowed = user.canCleanNotes();

    // Assert
    expect(allowed).toBe(true);
  });

  it.each([
    ['flag disabled', { insightsV2Enabled: false }],
    ['no AI consent', { consented: false }],
    ['notes excluded from AI', { aiIncludeNotes: false }],
  ])('should refuse cleanup when %s', (_label, options) => {
    // Arrange
    const user = buildUser('u1', options);

    // Act
    const allowed = user.canCleanNotes();

    // Assert
    expect(allowed).toBe(false);
  });
});

describe('NoteCleanupService', () => {
  let userRepository: {
    findWithInsightsV2Enabled: jest.Mock<() => Promise<User[]>>;
  };
  let dailyLogRepository: {
    findLogsNeedingCleanup: jest.Mock<
      (userId: string, limit: number) => Promise<DailyLogCleanupCandidate[]>
    >;
    saveCleanNotes: jest.Mock<
      (id: string, raw: string, clean: string) => Promise<void>
    >;
  };
  let llmService: {
    generateTextWithConfig: jest.Mock<(prompt: string) => Promise<string>>;
    getAnalysisModel: jest.Mock<() => string>;
  };
  let service: NoteCleanupService;

  beforeEach(() => {
    userRepository = { findWithInsightsV2Enabled: jest.fn() };
    dailyLogRepository = {
      findLogsNeedingCleanup: jest.fn().mockResolvedValue([]),
      saveCleanNotes: jest.fn().mockResolvedValue(undefined),
    };
    llmService = {
      generateTextWithConfig: jest.fn().mockResolvedValue('  Texte propre.  '),
      getAnalysisModel: jest.fn().mockReturnValue('mini-model'),
    };
    service = new NoteCleanupService(
      userRepository as unknown as UserRepository,
      dailyLogRepository as unknown as DailyLogRepository,
      llmService as unknown as LLMService,
    );
  });

  it('should only process users with the flag, AI consent and notes included', async () => {
    // Arrange
    userRepository.findWithInsightsV2Enabled.mockResolvedValue([
      buildUser('eligible', {}),
      buildUser('no-consent', { consented: false }),
      buildUser('no-notes', { aiIncludeNotes: false }),
      buildUser('flag-off', { insightsV2Enabled: false }),
    ]);

    // Act
    await service.cleanPendingNotes();

    // Assert
    expect(dailyLogRepository.findLogsNeedingCleanup).toHaveBeenCalledTimes(1);
    expect(dailyLogRepository.findLogsNeedingCleanup).toHaveBeenCalledWith(
      'eligible',
      20,
    );
  });

  it('should store the trimmed rewrite bound to the raw notes', async () => {
    // Arrange
    userRepository.findWithInsightsV2Enabled.mockResolvedValue([
      buildUser('u1', {}),
    ]);
    dailyLogRepository.findLogsNeedingCleanup.mockResolvedValue([
      { id: 'log-1', userId: 'u1', notes: 'texte brut dicte' },
    ]);

    // Act
    const summary = await service.cleanPendingNotes();

    // Assert
    expect(summary).toEqual({ cleaned: 1, failed: 0 });
    expect(dailyLogRepository.saveCleanNotes).toHaveBeenCalledWith(
      'log-1',
      'texte brut dicte',
      'Texte propre.',
    );
  });

  it('should continue after a failure and share the batch across users', async () => {
    // Arrange
    userRepository.findWithInsightsV2Enabled.mockResolvedValue([
      buildUser('u1', {}),
      buildUser('u2', {}),
    ]);
    dailyLogRepository.findLogsNeedingCleanup
      .mockResolvedValueOnce([
        { id: 'log-1', userId: 'u1', notes: 'a' },
        { id: 'log-2', userId: 'u1', notes: 'b' },
      ])
      .mockResolvedValueOnce([]);
    llmService.generateTextWithConfig
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValueOnce('B propre');

    // Act
    const summary = await service.cleanPendingNotes(5);

    // Assert
    expect(summary).toEqual({ cleaned: 1, failed: 1 });
    expect(dailyLogRepository.saveCleanNotes).toHaveBeenCalledTimes(1);
    expect(dailyLogRepository.saveCleanNotes).toHaveBeenCalledWith(
      'log-2',
      'b',
      'B propre',
    );
    expect(dailyLogRepository.findLogsNeedingCleanup).toHaveBeenLastCalledWith(
      'u2',
      3,
    );
  });
});
