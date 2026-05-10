import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FieldValueRepository } from '../../../../database/repositories/field-value.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { FieldValue } from '../../domain/entities/field-value.entity.js';

@Injectable()
export class FieldValueService {
  private readonly logger = new Logger(FieldValueService.name);

  constructor(
    private readonly fieldValueRepository: FieldValueRepository,
    private readonly dailyLogRepository: DailyLogRepository,
  ) {}

  async saveValue(fieldValue: FieldValue, userId: string): Promise<FieldValue> {
    await this.assertOwnership(fieldValue.dailyLogId, userId);
    this.logger.log(`Saving field value for log: ${fieldValue.dailyLogId}`);
    return this.fieldValueRepository.saveDomain(fieldValue);
  }

  async findByDailyLogId(
    dailyLogId: string,
    userId: string,
  ): Promise<FieldValue[]> {
    await this.assertOwnership(dailyLogId, userId);
    return this.fieldValueRepository.findByDailyLogId(dailyLogId);
  }

  async findById(id: string): Promise<FieldValue> {
    try {
      return await this.fieldValueRepository.findDomainById(id);
    } catch (error) {
      this.logger.error({ error }, 'Field value not found');
      throw new NotFoundException(`Field value with ID ${id} not found`);
    }
  }

  async updateValue(
    id: string,
    requestingUserId: string,
    newValue: string,
  ): Promise<FieldValue> {
    const existing = await this.findById(id);
    await this.assertOwnership(existing.dailyLogId, requestingUserId);
    return this.fieldValueRepository.updateDomain(id, { value: newValue });
  }

  async deleteValue(id: string, requestingUserId: string): Promise<void> {
    const existing = await this.findById(id);
    await this.assertOwnership(existing.dailyLogId, requestingUserId);
    await this.fieldValueRepository.deleteById(id);
  }

  private async assertOwnership(
    dailyLogId: string,
    requestingUserId: string,
  ): Promise<void> {
    try {
      const log = await this.dailyLogRepository.findDomainById(dailyLogId);
      if (log.userId !== requestingUserId) {
        throw new ForbiddenException('You do not own this field value');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException(`Daily log with ID ${dailyLogId} not found`);
    }
  }
}
