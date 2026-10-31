import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { HealthSyncTokenRepository } from '../../../../database/repositories/health-sync-token.repository.js';

export const SYNC_TOKEN_PURPOSE = 'health-sync-token';
export const SYNC_TOKEN_TTL_MS = 5 * 60 * 1000;
const SYNC_TOKEN_BYTES = 32;

export interface IssuedSyncToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class HealthSyncTokenService {
  constructor(
    private readonly tokenRepository: HealthSyncTokenRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async issue(
    userId: string,
    now: Date = new Date(),
  ): Promise<IssuedSyncToken> {
    const token = randomBytes(SYNC_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(now.getTime() + SYNC_TOKEN_TTL_MS);

    await this.tokenRepository.deleteExpiredForUser(userId, now);
    await this.tokenRepository.create({
      userId,
      tokenHash: this.hash(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  /** Returns the owner of a valid token and burns it, or null if unknown, expired or already used. */
  async consume(token: string, now: Date = new Date()): Promise<string | null> {
    return this.tokenRepository.consumeValid(this.hash(token), now);
  }

  private hash(token: string): string {
    return this.encryptionService.createKeyedHash(token, SYNC_TOKEN_PURPOSE);
  }
}
