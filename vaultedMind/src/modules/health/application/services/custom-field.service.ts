import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { CustomField } from '../../domain/entities/custom-field.entity.js';

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(private readonly customFieldRepository: CustomFieldRepository) {}

  async createField(field: CustomField): Promise<CustomField> {
    this.logger.log(
      `Creating custom field: ${field.name} for user: ${field.userId}`,
    );
    return this.customFieldRepository.saveDomain(field);
  }

  async findByUserId(userId: string): Promise<CustomField[]> {
    return this.customFieldRepository.findByUserId(userId);
  }

  async findById(id: string): Promise<CustomField> {
    try {
      return await this.customFieldRepository.findDomainById(id);
    } catch (error) {
      this.logger.error({ error }, 'Custom field not found');
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }
  }

  async updateField(
    id: string,
    requestingUserId: string,
    updates: Partial<Pick<CustomField, 'name' | 'isActive'>>,
  ): Promise<CustomField> {
    const existing = await this.findById(id);
    if (existing.userId !== requestingUserId) {
      throw new ForbiddenException('You do not own this custom field');
    }
    return this.customFieldRepository.updateDomain(id, updates);
  }

  async deleteField(id: string, requestingUserId: string): Promise<void> {
    const existing = await this.findById(id);
    if (existing.userId !== requestingUserId) {
      throw new ForbiddenException('You do not own this custom field');
    }
    await this.customFieldRepository.deleteById(id);
  }
}
