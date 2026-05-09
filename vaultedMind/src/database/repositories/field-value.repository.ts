import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { FieldValueModel } from '../models/field-value.model.js';
import { FieldValue } from '../../modules/health/domain/entities/field-value.entity.js';
import { FieldValueMapper } from '../mappers/field-value.mapper.js';

@Injectable()
export class FieldValueRepository extends AbstractBaseRepository<FieldValueModel> {
  constructor(
    @InjectRepository(FieldValueModel)
    fieldValueRepository: Repository<FieldValueModel>,
  ) {
    super(fieldValueRepository);
  }

  async findDomainById(id: string): Promise<FieldValue> {
    const model = await this.findById(id);
    return FieldValueMapper.toDomain(model);
  }

  async findByDailyLogId(dailyLogId: string): Promise<FieldValue[]> {
    const [models] = await this.repository.findAndCount({
      where: { dailyLogId },
    });
    return models.map((model) => FieldValueMapper.toDomain(model));
  }

  async saveDomain(entity: FieldValue): Promise<FieldValue> {
    const model = FieldValueMapper.toPersistence(entity);
    const savedModel = await this.repository.save(model);
    return FieldValueMapper.toDomain(savedModel);
  }

  async updateDomain(
    id: string,
    updates: Partial<Pick<FieldValue, 'value'>>,
  ): Promise<FieldValue> {
    await this.repository.update(id, updates);
    return this.findDomainById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
