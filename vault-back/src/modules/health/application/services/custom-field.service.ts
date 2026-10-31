import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import type {
  CustomFieldAppleWatchMetricUpdate,
  CustomFieldAutofillUpdate,
  CustomFieldConstructOverrideUpdate,
  CustomFieldGoalUpdate,
} from '../../domain/entities/custom-field.entity.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import {
  AppleWatchMetric,
  CustomField,
} from '../../domain/entities/custom-field.entity.js';
import {
  inferFieldUnit,
  isUnitCompatible,
  type HealthFieldUnit,
} from '../../domain/services/health-metric-units.js';

const HOURLY_OPTION = 'isHourly';

interface UnitSubject {
  name: string;
  max?: number | null;
  optionsOrder?: string[];
}

/** The unit a field stores a metric in: the one asked for, or the one its name and maximum suggest. */
function resolveMetricUnit(
  metric: AppleWatchMetric,
  field: UnitSubject,
  requested: HealthFieldUnit | null | undefined,
): HealthFieldUnit | null {
  const isHourly = (field.optionsOrder ?? []).includes(HOURLY_OPTION);
  if (requested !== undefined) {
    if (!isUnitCompatible(metric, requested, isHourly)) {
      throw new BadRequestException(
        'This unit does not suit this Apple Health metric',
      );
    }
    return requested;
  }
  const inference = inferFieldUnit(metric, { ...field, isHourly });
  return inference.compatible ? inference.unit : null;
}

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(private readonly customFieldRepository: CustomFieldRepository) {}

  async createField(field: CustomField): Promise<CustomField> {
    this.logger.log(
      `Creating custom field: ${field.name} for user: ${field.userId}`,
    );
    if (!field.appleWatchMetric) {
      return this.customFieldRepository.saveDomain(field);
    }
    const appleWatchUnit = resolveMetricUnit(
      field.appleWatchMetric,
      field,
      field.appleWatchUnit,
    );
    await this.customFieldRepository.clearAppleWatchMetric(
      field.userId,
      field.appleWatchMetric,
      field.id,
    );
    const saved = await this.customFieldRepository.saveDomain(field);
    return this.customFieldRepository.updateDomain(saved.id, {
      appleWatchUnit,
    });
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
    updates: Partial<
      Pick<
        CustomField,
        | 'name'
        | 'isActive'
        | 'optionsOrder'
        | 'category'
        | 'rememberLastValue'
        | 'min'
        | 'max'
        | 'subFields'
      >
    > &
      CustomFieldAppleWatchMetricUpdate &
      CustomFieldGoalUpdate &
      CustomFieldConstructOverrideUpdate &
      CustomFieldAutofillUpdate,
  ): Promise<CustomField> {
    const current = await this.findById(id, requestingUserId);
    if (updates.appleWatchMetric) {
      if (current.fieldType !== FieldType.NUMBER) {
        throw new BadRequestException(
          'Only a number field can receive an Apple Health metric',
        );
      }
      const unit = resolveMetricUnit(
        updates.appleWatchMetric,
        {
          name: updates.name ?? current.name,
          max: updates.max ?? current.max,
          optionsOrder: updates.optionsOrder ?? current.optionsOrder,
        },
        updates.appleWatchUnit,
      );
      await this.customFieldRepository.clearAppleWatchMetric(
        requestingUserId,
        updates.appleWatchMetric,
        id,
      );
      return this.customFieldRepository.updateDomain(id, {
        ...updates,
        appleWatchUnit: unit,
      });
    }
    if (updates.appleWatchMetric === null) {
      return this.customFieldRepository.updateDomain(id, {
        ...updates,
        appleWatchUnit: null,
      });
    }
    if (updates.appleWatchUnit !== undefined) {
      if (!current.appleWatchMetric) {
        throw new BadRequestException(
          'This field receives no Apple Health metric',
        );
      }
      resolveMetricUnit(
        current.appleWatchMetric,
        current,
        updates.appleWatchUnit,
      );
    }
    return this.customFieldRepository.updateDomain(id, updates);
  }

  async deleteField(id: string, requestingUserId: string): Promise<void> {
    await this.findById(id, requestingUserId);
    await this.customFieldRepository.deleteById(id);
  }
}
