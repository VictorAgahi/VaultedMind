import { jest } from '@jest/globals';
import {
  HealthSyncTokenService,
  SYNC_TOKEN_PURPOSE,
  SYNC_TOKEN_TTL_MS,
} from './health-sync-token.service.js';

describe('HealthSyncTokenService', () => {
  let repository: {
    create: jest.Mock<(data: object) => Promise<object>>;
    consumeValid: jest.Mock<
      (hash: string, now: Date) => Promise<string | null>
    >;
    deleteExpiredForUser: jest.Mock<
      (userId: string, before: Date) => Promise<void>
    >;
  };
  let encryption: {
    createKeyedHash: jest.Mock<(text: string, purpose: string) => string>;
  };
  let service: HealthSyncTokenService;

  beforeEach(() => {
    repository = {
      create: jest
        .fn<(data: object) => Promise<object>>()
        .mockResolvedValue({}),
      consumeValid:
        jest.fn<(hash: string, now: Date) => Promise<string | null>>(),
      deleteExpiredForUser: jest
        .fn<(userId: string, before: Date) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    encryption = {
      createKeyedHash: jest.fn((text: string) => `hash(${text})`),
    };
    service = new HealthSyncTokenService(
      repository as never,
      encryption as never,
    );
  });

  it('should issue a random url-safe token valid for 5 minutes and store only its hash', async () => {
    // Arrange
    const now = new Date('2026-10-31T20:00:00Z');

    // Act
    const issued = await service.issue('user-1', now);

    // Assert
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(issued.expiresAt.getTime()).toBe(now.getTime() + SYNC_TOKEN_TTL_MS);
    expect(repository.deleteExpiredForUser).toHaveBeenCalledWith('user-1', now);
    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: `hash(${issued.token})`,
      expiresAt: issued.expiresAt,
    });
    expect(encryption.createKeyedHash).toHaveBeenCalledWith(
      issued.token,
      SYNC_TOKEN_PURPOSE,
    );
  });

  it('should issue a different token each time', async () => {
    // Act
    const first = await service.issue('user-1');
    const second = await service.issue('user-1');

    // Assert
    expect(first.token).not.toBe(second.token);
  });

  it('should consume a valid token and return its owner', async () => {
    // Arrange
    const now = new Date('2026-10-31T20:01:00Z');
    repository.consumeValid.mockResolvedValue('user-1');

    // Act
    const userId = await service.consume('abc', now);

    // Assert
    expect(userId).toBe('user-1');
    expect(repository.consumeValid).toHaveBeenCalledWith('hash(abc)', now);
  });

  it('should return null when the token is unknown, expired or already used', async () => {
    // Arrange
    repository.consumeValid.mockResolvedValue(null);

    // Act
    const userId = await service.consume('abc');

    // Assert
    expect(userId).toBeNull();
  });
});
