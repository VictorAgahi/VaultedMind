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

  async findById(id: string, userId: string): Promise<CustomField> {
    try {
      const field = await this.customFieldRepository.findDomainById(id);
      if (field.userId !== userId) {
        throw new ForbiddenException('You do not own this custom field');
      }
      return field;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error({ error }, 'Custom field not found');
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }
  }

  async updateField(
    id: string,
    requestingUserId: string,
    updates: Partial<Pick<CustomField, 'name' | 'isActive' | 'optionsOrder'>>,
  ): Promise<CustomField> {
    await this.findById(id, requestingUserId);
    return this.customFieldRepository.updateDomain(id, updates);
  }

  async deleteField(id: string, requestingUserId: string): Promise<void> {
    await this.findById(id, requestingUserId);
    await this.customFieldRepository.deleteById(id);
  }
}
