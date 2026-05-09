import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { DailyLogModel } from '../models/daily-log.model.js';
import { DailyLog } from '../../modules/health/domain/entities/daily-log.entity.js';
import { DailyLogMapper } from '../mappers/daily-log.mapper.js';

@Injectable()
export class DailyLogRepository extends AbstractBaseRepository<DailyLogModel> {
  constructor(
    @InjectRepository(DailyLogModel)
    dailyLogRepository: Repository<DailyLogModel>,
  ) {
    super(dailyLogRepository);
  }

  async findDomainById(id: string): Promise<DailyLog> {
    const model = await this.findById(id);
    return DailyLogMapper.toDomain(model);
  }

  async findByUserId(userId: string): Promise<DailyLog[]> {
    const [models] = await this.repository.findAndCount({
      where: { userId },
      relations: ['fieldValues']
    });
    return models.map((model) => DailyLogMapper.toDomain(model));
  }

  async saveDomain(entity: DailyLog): Promise<DailyLog> {
    const model = DailyLogMapper.toPersistence(entity);
    const savedModel = await this.repository.save(model);
    return DailyLogMapper.toDomain(savedModel);
  }

  async updateDomain(
    id: string,
    updates: Partial<Pick<DailyLog, 'logDate' | 'notes'>>,
  ): Promise<DailyLog> {
    await this.repository.update(id, updates);
    return this.findDomainById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
