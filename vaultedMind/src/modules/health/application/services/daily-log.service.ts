import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { DailyLog } from '../../domain/entities/daily-log.entity.js';

@Injectable()
export class DailyLogService {
  private readonly logger = new Logger(DailyLogService.name);

  constructor(private readonly dailyLogRepository: DailyLogRepository) {}

  async createLog(log: DailyLog): Promise<DailyLog> {
    this.logger.log(`Creating daily log for user: ${log.userId}`);
    return this.dailyLogRepository.saveDomain(log);
  }

  async findByUserId(userId: string): Promise<DailyLog[]> {
    return this.dailyLogRepository.findByUserId(userId);
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
