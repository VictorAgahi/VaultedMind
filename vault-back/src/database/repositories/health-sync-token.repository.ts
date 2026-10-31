import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { HealthSyncTokenModel } from '../models/health-sync-token.model.js';

@Injectable()
export class HealthSyncTokenRepository extends AbstractBaseRepository<HealthSyncTokenModel> {
  constructor(
    @InjectRepository(HealthSyncTokenModel)
    healthSyncTokenRepository: Repository<HealthSyncTokenModel>,
  ) {
    super(healthSyncTokenRepository);
  }

  async deleteExpiredForUser(userId: string, before: Date): Promise<void> {
    await this.repository.delete({ userId, expiresAt: LessThan(before) });
  }

  /**
   * Marks a still valid, unused token as used and returns its user, in one atomic statement
   * so two concurrent requests can never both consume the same token.
   */
  async consumeValid(tokenHash: string, now: Date): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(HealthSyncTokenModel)
      .set({ usedAt: now })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :now', { now })
      .returning('user_id')
      .execute();
    const rows = result.raw as Array<{ user_id: string }>;
    return rows.length > 0 ? rows[0].user_id : null;
  }
}
