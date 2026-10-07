import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { AIChatUsageModel } from '../models/ai-chat-usage.model.js';

export interface AIChatUsageStatus {
  count: number;
  maxAllowed: number;
  remaining: number;
  nextAvailableAt: Date | null;
  cooldownRemainingMs: number;
}

@Injectable()
export class AIChatUsageRepository extends AbstractBaseRepository<AIChatUsageModel> {
  private readonly logger = new Logger(AIChatUsageRepository.name);
  private static readonly MAX_PROMPTS_PER_WINDOW = 2;
  private static readonly WINDOW_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

  // In-memory fallback in case DB table is not yet migrated
  private readonly inMemoryStore = new Map<string, number[]>();

  constructor(
    @InjectRepository(AIChatUsageModel)
    aiChatUsageRepository: Repository<AIChatUsageModel>,
  ) {
    super(aiChatUsageRepository);
  }

  async getUsageStatus(userId: string): Promise<AIChatUsageStatus> {
    const twelveHoursAgo = new Date(
      Date.now() - AIChatUsageRepository.WINDOW_DURATION_MS,
    );

    try {
      const recentUsages = await this.repository.find({
        where: {
          userId,
          createdAt: MoreThan(twelveHoursAgo),
        },
        order: { createdAt: 'ASC' },
      });

      const count = recentUsages.length;
      const remaining = Math.max(
        0,
        AIChatUsageRepository.MAX_PROMPTS_PER_WINDOW - count,
      );

      let nextAvailableAt: Date | null = null;
      let cooldownRemainingMs = 0;

      if (remaining === 0 && recentUsages.length > 0) {
        // The earliest prompt expires 12 hours after it was created
        const oldestRecent = recentUsages[0];
        nextAvailableAt = new Date(
          oldestRecent.createdAt.getTime() +
            AIChatUsageRepository.WINDOW_DURATION_MS,
        );
        cooldownRemainingMs = Math.max(
          0,
          nextAvailableAt.getTime() - Date.now(),
        );
      }

      return {
        count,
        maxAllowed: AIChatUsageRepository.MAX_PROMPTS_PER_WINDOW,
        remaining,
        nextAvailableAt,
        cooldownRemainingMs,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to query ai_chat_usages table, falling back to in-memory store: ${(error as Error).message}`,
      );
      return this.getInMemoryStatus(userId);
    }
  }

  async recordUsage(userId: string): Promise<void> {
    try {
      const usage = this.repository.create({
        userId,
      });
      await this.repository.save(usage);
    } catch (error) {
      this.logger.warn(
        `Failed to save ai_chat_usages row, recording in in-memory store: ${(error as Error).message}`,
      );
      this.recordInMemoryUsage(userId);
    }
  }

  private getInMemoryStatus(userId: string): AIChatUsageStatus {
    const now = Date.now();
    const cutoff = now - AIChatUsageRepository.WINDOW_DURATION_MS;
    const timestamps = (this.inMemoryStore.get(userId) || []).filter(
      (ts) => ts > cutoff,
    );
    this.inMemoryStore.set(userId, timestamps);

    const count = timestamps.length;
    const remaining = Math.max(
      0,
      AIChatUsageRepository.MAX_PROMPTS_PER_WINDOW - count,
    );

    let nextAvailableAt: Date | null = null;
    let cooldownRemainingMs = 0;

    if (remaining === 0 && timestamps.length > 0) {
      nextAvailableAt = new Date(
        timestamps[0] + AIChatUsageRepository.WINDOW_DURATION_MS,
      );
      cooldownRemainingMs = Math.max(0, nextAvailableAt.getTime() - now);
    }

    return {
      count,
      maxAllowed: AIChatUsageRepository.MAX_PROMPTS_PER_WINDOW,
      remaining,
      nextAvailableAt,
      cooldownRemainingMs,
    };
  }

  private recordInMemoryUsage(userId: string): void {
    const timestamps = this.inMemoryStore.get(userId) || [];
    timestamps.push(Date.now());
    this.inMemoryStore.set(userId, timestamps);
  }
}
