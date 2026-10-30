import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { DailyLog } from '../../domain/entities/daily-log.entity.js';
import type { DailyEntry } from '../../domain/entities/daily-entry.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';

@Injectable()
export class DailyLogService {
  private readonly logger = new Logger(DailyLogService.name);

  constructor(
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
  ) {}

  /**
   * Saves a whole day atomically after checking that every field belongs to the user.
   */
  async saveEntry(entry: DailyEntry): Promise<DailyLog> {
    const ownedFieldIds = new Set(
      (await this.customFieldRepository.findByUserId(entry.userId)).map(
        (field) => field.id,
      ),
    );
    const referencedIds = [
      ...entry.values.map((value) => value.customFieldId),
      ...entry.clearedFieldIds,
    ];
    const foreignId = referencedIds.find((id) => !ownedFieldIds.has(id));
    if (foreignId) {
      throw new ForbiddenException('You do not own this custom field');
    }
    if (entry.logId) {
      await this.findById(entry.logId, entry.userId);
    }
    this.logger.log(`Saving daily entry for user: ${entry.userId}`);
    return this.dailyLogRepository.saveEntry(entry);
  }

  async createLog(log: DailyLog): Promise<DailyLog> {
    this.logger.log(`Creating daily log for user: ${log.userId}`);
    return this.dailyLogRepository.saveDomain(log);
  }

  async findByUserId(userId: string): Promise<DailyLog[]> {
    return this.dailyLogRepository.findByUserId(userId);
  }

  async hasLoggedOn(userId: string, localDate: string): Promise<boolean> {
    return this.dailyLogRepository.hasLoggedOn(userId, localDate);
  }

  async hasLoggedToday(userId: string): Promise<boolean> {
    return this.dailyLogRepository.hasLoggedToday(userId);
  }

  async findById(id: string, userId: string): Promise<DailyLog> {
    try {
      const log = await this.dailyLogRepository.findDomainById(id);
      if (log.userId !== userId) {
        throw new ForbiddenException('You do not own this daily log');
      }
      return log;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error({ error, id }, 'Daily log not found');
      throw new NotFoundException(`Daily log with ID ${id} not found`);
    }
  }

  async updateLog(
    id: string,
    requestingUserId: string,
    updates: Partial<Pick<DailyLog, 'logDate' | 'notes'>>,
  ): Promise<DailyLog> {
    await this.findById(id, requestingUserId);
    return this.dailyLogRepository.updateDomain(id, updates);
  }

  async deleteLog(id: string, requestingUserId: string): Promise<void> {
    await this.findById(id, requestingUserId);
    await this.dailyLogRepository.deleteById(id);
  }
}
