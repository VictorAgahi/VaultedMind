import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { DailyLogModel } from '../models/daily-log.model.js';
import { DailyLog } from '../../modules/health/domain/entities/daily-log.entity.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import { DailyLogMapper } from '../mappers/daily-log.mapper.js';
import { FieldValueModel } from '../models/field-value.model.js';
import type { DailyEntry } from '../../modules/health/domain/entities/daily-entry.js';

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
    this.decryptModel(model);
    return DailyLogMapper.toDomain(model);
  }

  async findByUserId(userId: string): Promise<DailyLog[]> {
    const [models] = await this.repository.findAndCount({
      where: { userId },
      relations: ['fieldValues'],
    });

    models.forEach((model) => this.decryptModel(model));

    return models.map((model) => DailyLogMapper.toDomain(model));
  }

  async hasLoggedOn(userId: string, localDate: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.logDate = :localDate', { localDate })
      .getCount();
    return count > 0;
  }

  async hasLoggedToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const count = await this.repository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.logDate = :today', { today })
      .getCount();
    return count > 0;
  }

  /**
   * Saves a whole day in one transaction: the log (created or updated, one per user and date),
   * every non-empty value, and the removal of cleared values. Nothing is half-saved.
   */
  async saveEntry(entry: DailyEntry): Promise<DailyLog> {
    const savedLogId = await this.repository.manager.transaction(
      async (manager): Promise<string> => {
        const logs = manager.getRepository(DailyLogModel);
        const values = manager.getRepository(FieldValueModel);

        const existing = entry.logId
          ? await logs.findOne({
              where: { id: entry.logId, userId: entry.userId },
            })
          : await logs
              .createQueryBuilder('log')
              .where('log.userId = :userId', { userId: entry.userId })
              .andWhere('log.logDate = :logDate', { logDate: entry.logDate })
              .getOne();

        const encryptedNotes = entry.notes?.trim()
          ? this.encryptionService.encrypt(entry.notes)
          : undefined;

        let logId: string;
        if (existing) {
          await logs.update(existing.id, {
            logDate: new Date(entry.logDate),
            notes: encryptedNotes ?? null,
          });
          logId = existing.id;
        } else {
          const created = await logs.save(
            logs.create({
              userId: entry.userId,
              logDate: new Date(entry.logDate),
              notes: encryptedNotes,
            }),
          );
          logId = created.id;
        }

        for (const item of entry.values) {
          const encryptedValue = this.encryptionService.encrypt(item.value);
          const current = await values.findOne({
            where: { dailyLogId: logId, customFieldId: item.customFieldId },
          });
          if (current) {
            await values.update(current.id, {
              value: encryptedValue,
              subValues: item.subValues ?? null,
            });
          } else {
            await values.save(
              values.create({
                dailyLogId: logId,
                customFieldId: item.customFieldId,
                value: encryptedValue,
                subValues: item.subValues,
              }),
            );
          }
        }

        for (const fieldId of entry.clearedFieldIds) {
          await values.delete({ dailyLogId: logId, customFieldId: fieldId });
        }

        return logId;
      },
    );

    const saved = await this.repository.findOne({
      where: { id: savedLogId },
      relations: ['fieldValues'],
    });
    if (!saved) {
      throw new Error(`Daily log ${savedLogId} disappeared after save`);
    }
    this.decryptModel(saved);
    return DailyLogMapper.toDomain(saved);
  }

  async saveDomain(entity: DailyLog): Promise<DailyLog> {
    const model = DailyLogMapper.toPersistence(entity);
    if (model.notes) {
      model.notes = this.encryptionService.encrypt(model.notes);
    }
    const savedModel = await this.repository.save(model);

    this.decryptModel(savedModel);
    return DailyLogMapper.toDomain(savedModel);
  }

  private decryptModel(model: DailyLogModel): void {
    if (model.notes) {
      try {
        model.notes = this.encryptionService.decrypt(model.notes);
      } catch (e) {
        Logger.error('Failed to decrypt notes', e);
      }
    }

    if (model.fieldValues && Array.isArray(model.fieldValues)) {
      model.fieldValues.forEach((fv) => {
        if (fv.value) {
          try {
            fv.value = this.encryptionService.decrypt(fv.value);
          } catch (e) {
            Logger.error('Failed to decrypt field value', e);
          }
        }
      });
    }
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
