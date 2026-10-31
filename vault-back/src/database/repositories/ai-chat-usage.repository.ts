import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { AIChatUsageModel } from '../models/ai-chat-usage.model.js';

export interface AIChatUsageStatus {
  count: number;
  maxAllowed: number;
  remaining: number;
  nextAvailableAt: Date | null;
  cooldownRemainingMs: number;
}

/**
 * Kinds of LLM usage tracked for quota purposes.
 * Each kind has its own budget per window (12h, or 24h for the voice entry kinds).
 */
export type AIUsageKind =
  | 'chat'
  | 'insight'
  | 'optimize'
  | 'voice'
  | 'autofill';

export interface AIUsageReservation {
  status: AIChatUsageStatus;
  usageId: string | null;
}

@Injectable()
export class AIChatUsageRepository extends AbstractBaseRepository<AIChatUsageModel> {
  private readonly logger = new Logger(AIChatUsageRepository.name);
  private static readonly MAX_USAGES_PER_WINDOW: Record<AIUsageKind, number> = {
    chat: 5,
    insight: 1,
    optimize: 3,
    voice: 30,
    autofill: 30,
  };
  private static readonly DEFAULT_WINDOW_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
  private static readonly DAY_WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly WINDOW_DURATION_MS: Record<AIUsageKind, number> = {
    chat: AIChatUsageRepository.DEFAULT_WINDOW_DURATION_MS,
    insight: AIChatUsageRepository.DEFAULT_WINDOW_DURATION_MS,
    optimize: AIChatUsageRepository.DEFAULT_WINDOW_DURATION_MS,
    voice: AIChatUsageRepository.DAY_WINDOW_DURATION_MS,
    autofill: AIChatUsageRepository.DAY_WINDOW_DURATION_MS,
  };

  // In-memory fallback in case DB table is not yet migrated
  private readonly inMemoryStore = new Map<string, number[]>();

  constructor(
    @InjectRepository(AIChatUsageModel)
    aiChatUsageRepository: Repository<AIChatUsageModel>,
  ) {
    super(aiChatUsageRepository);
  }

  async getUsageStatus(
    userId: string,
    kind: AIUsageKind = 'chat',
  ): Promise<AIChatUsageStatus> {
    try {
      return await this.computeStatus(this.repository.manager, userId, kind);
    } catch (error) {
      this.logger.warn(
        `Failed to query ai_chat_usages table, falling back to in-memory store: ${(error as Error).message}`,
      );
      return this.getInMemoryStatus(userId, kind);
    }
  }

  /**
   * Atomically checks the quota and records a usage BEFORE the LLM call,
   * so concurrent requests cannot all pass the check.
   * Returns usageId = null when the quota is exhausted.
   */
  async tryReserve(
    userId: string,
    kind: AIUsageKind = 'chat',
  ): Promise<AIUsageReservation> {
    try {
      return await this.repository.manager.transaction(async (manager) => {
        // Serialize reservations for the same user and kind
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `ai_usage:${kind}:${userId}`,
        ]);

        const status = await this.computeStatus(manager, userId, kind);
        if (status.remaining <= 0) {
          return { status, usageId: null };
        }

        const usage = manager.create(AIChatUsageModel, { userId, kind });
        const saved = await manager.save(usage);
        return { status, usageId: saved.id };
      });
    } catch (error) {
      this.logger.warn(
        `Failed to reserve ai_chat_usages row, using in-memory store: ${(error as Error).message}`,
      );
      return this.tryReserveInMemory(userId, kind);
    }
  }

  /**
   * Cancels a reservation when the LLM call failed, so the user is not charged.
   */
  async release(usageId: string | null): Promise<void> {
    if (!usageId) return;

    if (usageId.startsWith('mem:')) {
      const [, key, ts] = usageId.split('|');
      const timestamps = this.inMemoryStore.get(key) || [];
      this.inMemoryStore.set(
        key,
        timestamps.filter((t) => t !== Number(ts)),
      );
      return;
    }

    try {
      await this.repository.delete(usageId);
    } catch (error) {
      this.logger.warn(
        `Failed to release ai_chat_usages row ${usageId}: ${(error as Error).message}`,
      );
    }
  }

  private async computeStatus(
    manager: EntityManager,
    userId: string,
    kind: AIUsageKind,
  ): Promise<AIChatUsageStatus> {
    const maxAllowed = AIChatUsageRepository.MAX_USAGES_PER_WINDOW[kind];
    const windowDurationMs = AIChatUsageRepository.WINDOW_DURATION_MS[kind];
    const windowStart = new Date(Date.now() - windowDurationMs);

    const recentUsages = await manager.find(AIChatUsageModel, {
      where: {
        userId,
        kind,
        createdAt: MoreThan(windowStart),
      },
      order: { createdAt: 'ASC' },
    });

    const count = recentUsages.length;
    const remaining = Math.max(0, maxAllowed - count);

    let nextAvailableAt: Date | null = null;
    let cooldownRemainingMs = 0;

    if (remaining === 0 && recentUsages.length > 0) {
      // The earliest usage expires 12 hours after it was created
      const oldestRecent = recentUsages[0];
      nextAvailableAt = new Date(
        oldestRecent.createdAt.getTime() + windowDurationMs,
      );
      cooldownRemainingMs = Math.max(0, nextAvailableAt.getTime() - Date.now());
    }

    return {
      count,
      maxAllowed,
      remaining,
      nextAvailableAt,
      cooldownRemainingMs,
    };
  }

  private getInMemoryStatus(
    userId: string,
    kind: AIUsageKind,
  ): AIChatUsageStatus {
    const maxAllowed = AIChatUsageRepository.MAX_USAGES_PER_WINDOW[kind];
    const key = `${kind}:${userId}`;
    const now = Date.now();
    const windowDurationMs = AIChatUsageRepository.WINDOW_DURATION_MS[kind];
    const cutoff = now - windowDurationMs;
    const timestamps = (this.inMemoryStore.get(key) || []).filter(
      (ts) => ts > cutoff,
    );
    this.inMemoryStore.set(key, timestamps);

    const count = timestamps.length;
    const remaining = Math.max(0, maxAllowed - count);

    let nextAvailableAt: Date | null = null;
    let cooldownRemainingMs = 0;

    if (remaining === 0 && timestamps.length > 0) {
      nextAvailableAt = new Date(timestamps[0] + windowDurationMs);
      cooldownRemainingMs = Math.max(0, nextAvailableAt.getTime() - now);
    }

    return {
      count,
      maxAllowed,
      remaining,
      nextAvailableAt,
      cooldownRemainingMs,
    };
  }

  // Synchronous check-and-push: no await in between, so it is atomic in Node
  private tryReserveInMemory(
    userId: string,
    kind: AIUsageKind,
  ): AIUsageReservation {
    const status = this.getInMemoryStatus(userId, kind);
    if (status.remaining <= 0) {
      return { status, usageId: null };
    }

    const key = `${kind}:${userId}`;
    const ts = Date.now();
    const timestamps = this.inMemoryStore.get(key) || [];
    timestamps.push(ts);
    this.inMemoryStore.set(key, timestamps);
    return { status, usageId: `mem:|${key}|${ts}` };
  }
}
