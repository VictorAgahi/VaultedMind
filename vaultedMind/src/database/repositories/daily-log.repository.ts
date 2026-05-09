import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { DailyLogModel } from '../models/daily-log.model.js';
import { DailyLog } from '../../modules/health/domain/entities/daily-log.entity.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import { DailyLogMapper } from '../mappers/daily-log.mapper.js';

@Injectable()
export class DailyLogRepository extends AbstractBaseRepository<DailyLogModel> {
  constructor(
    @InjectRepository(DailyLogModel)
    dailyLogRepository: Repository<DailyLogModel>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(dailyLogRepository);
  }

  async findDomainById(id: string): Promise<DailyLog> {
    const model = await this.findById(id);
    if (model.notes) {
      try {
        model.notes = this.encryptionService.decrypt(model.notes);
      } catch (e) {
        Logger.error(e);
      }
    }
    return DailyLogMapper.toDomain(model);
  }

  async findByUserId(userId: string): Promise<DailyLog[]> {
    const [models] = await this.repository.findAndCount({
      where: { userId },
      relations: ['fieldValues'],
    });

    models.forEach((model) => {
      if (model.notes) {
        try {
          model.notes = this.encryptionService.decrypt(model.notes);
        } catch (e) {
          Logger.error(e);
        }
      }
    });

    return models.map((model) => DailyLogMapper.toDomain(model));
  }

  async saveDomain(entity: DailyLog): Promise<DailyLog> {
    const model = DailyLogMapper.toPersistence(entity);
    if (model.notes) {
      model.notes = this.encryptionService.encrypt(model.notes);
    }
    const savedModel = await this.repository.save(model);

    // Decrypt for returning the domain entity
    if (savedModel.notes) {
      savedModel.notes = this.encryptionService.decrypt(savedModel.notes);
    }
    return DailyLogMapper.toDomain(savedModel);
  }

  async updateDomain(
    id: string,
    updates: Partial<Pick<DailyLog, 'logDate' | 'notes'>>,
  ): Promise<DailyLog> {
    const encryptedUpdates = { ...updates };
    if (encryptedUpdates.notes) {
      encryptedUpdates.notes = this.encryptionService.encrypt(
        encryptedUpdates.notes,
      );
    }
    await this.repository.update(id, encryptedUpdates);
    return this.findDomainById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
