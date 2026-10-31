import { jest } from '@jest/globals';
import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  baseMimeType,
  VOICE_MAX_BYTES,
  VoiceTranscriptionService,
  type VoiceUpload,
} from './voice-transcription.service.js';
import {
  User,
  DEFAULT_USER_PREFERENCES,
} from '../../../user/domain/entities/user.entity.js';
import { AIConsentRequiredException } from '../../domain/exceptions/ai-consent-required.exception.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';
import type {
  AIChatUsageRepository,
  AIUsageReservation,
} from '../../../../database/repositories/ai-chat-usage.repository.js';
import type { AudioTranscriptionInput, LLMService } from './llm.service.js';

const buildUser = (
  consented: boolean = true,
  includeNotes: boolean = true,
): User =>
  new User(
    'user-1',
    'u@test.com',
    'hash',
    new Date(),
    new Date(),
    true,
    undefined,
    false,
    undefined,
    { ...DEFAULT_USER_PREFERENCES, aiIncludeNotes: includeNotes },
    { aiConsentAt: consented ? new Date() : undefined },
  );

const upload = (overrides: Partial<VoiceUpload> = {}): VoiceUpload => ({
  buffer: Buffer.from('audio'),
  mimetype: 'audio/mp4',
  size: 5,
  ...overrides,
});

describe('VoiceTranscriptionService', () => {
  let userRepository: { findUserById: jest.Mock<() => Promise<User>> };
  let usageRepository: {
    tryReserve: jest.Mock<() => Promise<AIUsageReservation>>;
    release: jest.Mock<(id: string | null) => Promise<void>>;
  };
  let llmService: {
    transcribeAudio: jest.Mock<
      (input: AudioTranscriptionInput) => Promise<string>
    >;
  };
  let service: VoiceTranscriptionService;

  beforeEach(() => {
    userRepository = {
      findUserById: jest
        .fn<() => Promise<User>>()
        .mockResolvedValue(buildUser()),
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
      transcribeAudio: jest
        .fn<(input: AudioTranscriptionInput) => Promise<string>>()
        .mockResolvedValue("  Bonjour, j'ai dormi six heures.  "),
    };
    service = new VoiceTranscriptionService(
      userRepository as unknown as UserRepository,
      usageRepository as unknown as AIChatUsageRepository,
      llmService as unknown as LLMService,
    );
  });

  it('should transcribe the audio in French and return the trimmed text', async () => {
    // Act
    const result = await service.transcribe('user-1', upload());

    // Assert
    expect(result).toEqual({ text: "Bonjour, j'ai dormi six heures." });
    expect(llmService.transcribeAudio).toHaveBeenCalledWith({
      audio: Buffer.from('audio'),
      fileName: 'recording.m4a',
      mimeType: 'audio/mp4',
      language: 'fr',
    });
    expect(usageRepository.release).not.toHaveBeenCalled();
  });

  it.each([
    ['audio/mp4', 'recording.m4a'],
    ['audio/m4a', 'recording.m4a'],
    ['audio/x-m4a', 'recording.m4a'],
    ['audio/webm;codecs=opus', 'recording.webm'],
    ['audio/mpeg', 'recording.mp3'],
    ['audio/wav', 'recording.wav'],
  ])('should accept %s', async (mimetype, fileName) => {
    // Act
    await service.transcribe('user-1', upload({ mimetype }));

    // Assert
    expect(llmService.transcribeAudio).toHaveBeenCalledWith(
      expect.objectContaining({ fileName }),
    );
  });

  it('should reject an unsupported mime type before reserving a usage', async () => {
    // Act / Assert
    await expect(
      service.transcribe('user-1', upload({ mimetype: 'video/mp4' })),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(usageRepository.tryReserve).not.toHaveBeenCalled();
  });

  it('should reject a missing, empty or oversized recording', async () => {
    // Act / Assert
    await expect(
      service.transcribe('user-1', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.transcribe('user-1', upload({ size: 0 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.transcribe('user-1', upload({ size: VOICE_MAX_BYTES + 1 })),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(llmService.transcribeAudio).not.toHaveBeenCalled();
  });

  it('should require AI consent with notes included', async () => {
    // Arrange
    userRepository.findUserById.mockResolvedValueOnce(buildUser(false));
    userRepository.findUserById.mockResolvedValueOnce(buildUser(true, false));

    // Act / Assert
    await expect(service.transcribe('user-1', upload())).rejects.toBeInstanceOf(
      AIConsentRequiredException,
    );
    await expect(service.transcribe('user-1', upload())).rejects.toBeInstanceOf(
      AIConsentRequiredException,
    );
    expect(llmService.transcribeAudio).not.toHaveBeenCalled();
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
        cooldownRemainingMs: 7_200_000,
      },
    });

    // Act / Assert
    await expect(service.transcribe('user-1', upload())).rejects.toMatchObject({
      status: 429,
    });
    expect(usageRepository.tryReserve).toHaveBeenCalledWith('user-1', 'voice');
    expect(llmService.transcribeAudio).not.toHaveBeenCalled();
  });

  it('should release the reservation when the transcription fails', async () => {
    // Arrange
    llmService.transcribeAudio.mockRejectedValue(new Error('provider down'));

    // Act / Assert
    await expect(service.transcribe('user-1', upload())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(usageRepository.release).toHaveBeenCalledWith('usage-1');
  });
});

describe('baseMimeType', () => {
  it('should drop codec parameters and normalize the case', () => {
    expect(baseMimeType('Audio/WebM; codecs=opus')).toBe('audio/webm');
  });
});
