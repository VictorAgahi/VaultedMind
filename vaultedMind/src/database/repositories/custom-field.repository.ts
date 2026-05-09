import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { CustomFieldModel } from '../models/custom-field.model.js';
import { CustomField } from '../../modules/health/domain/entities/custom-field.entity.js';
import { CustomFieldMapper } from '../mappers/custom-field.mapper.js';

@Injectable()
export class CustomFieldRepository extends AbstractBaseRepository<CustomFieldModel> {
  constructor(
    @InjectRepository(CustomFieldModel)
    customFieldRepository: Repository<CustomFieldModel>,
  ) {
    super(customFieldRepository);
  }

  async findDomainById(id: string): Promise<CustomField> {
    const model = await this.findById(id);
    return CustomFieldMapper.toDomain(model);
  }

  async findByUserId(userId: string): Promise<CustomField[]> {
    const [models] = await this.repository.findAndCount({ where: { userId } });
    return models.map((model) => CustomFieldMapper.toDomain(model));
  }

  async saveDomain(entity: CustomField): Promise<CustomField> {
    const model = CustomFieldMapper.toPersistence(entity);
    const savedModel = await this.repository.save(model);
    return CustomFieldMapper.toDomain(savedModel);
  }

  async updateDomain(
    id: string,
    updates: Partial<Pick<CustomField, 'name' | 'isActive'>>,
  ): Promise<CustomField> {
    await this.repository.update(id, updates);
    return this.findDomainById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
