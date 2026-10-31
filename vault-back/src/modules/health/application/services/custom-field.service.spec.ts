import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import type { HealthLinkingState } from '../../domain/services/health-linking-decisions.js';
import type { HealthFieldUnit } from '../../domain/services/health-metric-units.js';
import { CustomFieldService } from './custom-field.service.js';

function field(
  id: string,
  fieldType: FieldType = FieldType.NUMBER,
): CustomField {
  return new CustomField(
    id,
    'user-1',
    'Champ',
    fieldType,
    true,
    new Date(),
    new Date(),
  );
}

describe('CustomFieldService Apple Health mapping', () => {
  let repository: {
    findDomainById: jest.Mock<(id: string) => Promise<CustomField>>;
    updateDomain: jest.Mock<
      (id: string, updates: object) => Promise<CustomField>
    >;
    clearAppleWatchMetric: jest.Mock<
      (
        userId: string,
        metric: AppleWatchMetric,
        except: string,
      ) => Promise<void>
    >;
    saveDomain: jest.Mock<(entity: CustomField) => Promise<CustomField>>;
  };
  let userRepository: {
    findHealthLinkingState: jest.Mock<() => Promise<HealthLinkingState>>;
    saveHealthLinkingState: jest.Mock<
      (userId: string, state: HealthLinkingState) => Promise<void>
    >;
  };
  let linker: {
    backfill: jest.Mock<
      (
        userId: string,
        fieldId: string,
        metric: AppleWatchMetric,
        unit: HealthFieldUnit | null,
      ) => Promise<number>
    >;
  };
  let service: CustomFieldService;

  beforeEach(() => {
    repository = {
      findDomainById: jest
        .fn<(id: string) => Promise<CustomField>>()
        .mockImplementation((id) => Promise.resolve(field(id))),
      updateDomain: jest
        .fn<(id: string, updates: object) => Promise<CustomField>>()
        .mockImplementation((id) => Promise.resolve(field(id))),
      clearAppleWatchMetric: jest
        .fn<
          (
            userId: string,
            metric: AppleWatchMetric,
            except: string,
          ) => Promise<void>
        >()
        .mockResolvedValue(undefined),
      saveDomain: jest
        .fn<(entity: CustomField) => Promise<CustomField>>()
        .mockImplementation((entity) => Promise.resolve(entity)),
    };
    userRepository = {
      findHealthLinkingState: jest
        .fn<() => Promise<HealthLinkingState>>()
        .mockResolvedValue({ decisions: {}, skipped: [] }),
      saveHealthLinkingState: jest
        .fn<(userId: string, state: HealthLinkingState) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    linker = {
      backfill: jest
        .fn<
          (
            userId: string,
            fieldId: string,
            metric: AppleWatchMetric,
            unit: HealthFieldUnit | null,
          ) => Promise<number>
        >()
        .mockResolvedValue(12),
    };
    service = new CustomFieldService(
      repository as never,
      userRepository as never,
      linker as never,
    );
  });

  it('should unset the metric on the other fields before assigning it', async () => {
    // Arrange
    const updates = { appleWatchMetric: AppleWatchMetric.SLEEP };

    // Act
    await service.updateField('field-2', 'user-1', updates);

    // Assert
    expect(repository.clearAppleWatchMetric).toHaveBeenCalledWith(
      'user-1',
      AppleWatchMetric.SLEEP,
      'field-2',
    );
    expect(repository.updateDomain).toHaveBeenCalledWith('field-2', {
      ...updates,
      appleWatchUnit: 'hours',
    });
  });

  it('should infer minutes for a duration field whose name says so', async () => {
    // Arrange
    repository.findDomainById.mockResolvedValue(
      new CustomField(
        'field-3',
        'user-1',
        'Sommeil (min)',
        FieldType.NUMBER,
        true,
        new Date(),
        new Date(),
      ),
    );

    // Act
    await service.updateField('field-3', 'user-1', {
      appleWatchMetric: AppleWatchMetric.SLEEP,
    });

    // Assert
    expect(repository.updateDomain).toHaveBeenCalledWith('field-3', {
      appleWatchMetric: AppleWatchMetric.SLEEP,
      appleWatchUnit: 'minutes',
    });
  });

  it('should keep no unit for a metric that is not a duration', async () => {
    // Arrange / Act
    await service.updateField('field-2', 'user-1', {
      appleWatchMetric: AppleWatchMetric.STEPS,
    });

    // Assert
    expect(repository.updateDomain).toHaveBeenCalledWith('field-2', {
      appleWatchMetric: AppleWatchMetric.STEPS,
      appleWatchUnit: null,
    });
  });

  it('should refuse a unit on a metric that is not a duration', async () => {
    // Arrange / Act
    const attempt = service.updateField('field-2', 'user-1', {
      appleWatchMetric: AppleWatchMetric.STEPS,
      appleWatchUnit: 'minutes',
    });

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateDomain).not.toHaveBeenCalled();
  });

  it('should not touch other fields when the metric is removed', async () => {
    // Arrange / Act
    await service.updateField('field-2', 'user-1', { appleWatchMetric: null });

    // Assert
    expect(repository.clearAppleWatchMetric).not.toHaveBeenCalled();
    expect(repository.updateDomain).toHaveBeenCalledWith('field-2', {
      appleWatchMetric: null,
      appleWatchUnit: null,
    });
  });

  it('should refuse a metric on a field that is not a number', async () => {
    // Arrange
    repository.findDomainById.mockResolvedValue(
      field('text-field', FieldType.STRING),
    );

    // Act
    const attempt = service.updateField('text-field', 'user-1', {
      appleWatchMetric: AppleWatchMetric.STEPS,
    });

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateDomain).not.toHaveBeenCalled();
  });

  it('should enforce the rule on creation too', async () => {
    // Arrange
    const created = new CustomField(
      'new',
      'user-1',
      'Pas',
      FieldType.NUMBER,
      true,
      new Date(),
      new Date(),
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      AppleWatchMetric.STEPS,
    );

    // Act
    await service.createField(created);

    // Assert
    expect(repository.clearAppleWatchMetric).toHaveBeenCalledWith(
      'user-1',
      AppleWatchMetric.STEPS,
      'new',
    );
  });

  describe('manual mapping backfill', () => {
    function linkedField(
      id: string,
      metric: AppleWatchMetric,
      unit: HealthFieldUnit | null,
    ): CustomField {
      return new CustomField(
        id,
        'user-1',
        'Champ',
        FieldType.NUMBER,
        true,
        new Date(),
        new Date(),
        undefined,
        undefined,
        false,
        undefined,
        undefined,
        metric,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'AUTO',
        unit ?? undefined,
      );
    }

    it('should backfill the field and record the link when a metric is set', async () => {
      // Arrange
      repository.updateDomain.mockResolvedValue(
        linkedField('field-2', AppleWatchMetric.SLEEP_DEEP, 'hours'),
      );

      // Act
      const result = await service.updateFieldAndBackfill('field-2', 'user-1', {
        appleWatchMetric: AppleWatchMetric.SLEEP_DEEP,
      });

      // Assert
      expect(result.healthFilledDays).toBe(12);
      expect(linker.backfill).toHaveBeenCalledWith(
        'user-1',
        'field-2',
        AppleWatchMetric.SLEEP_DEEP,
        'hours',
      );
      const [, saved] = userRepository.saveHealthLinkingState.mock.calls[0];
      expect(saved.decisions[AppleWatchMetric.SLEEP_DEEP]).toMatchObject({
        status: 'LINKED',
        fieldId: 'field-2',
        unit: 'hours',
        auto: false,
      });
    });

    it('should backfill again when only the unit of a linked field changes', async () => {
      // Arrange
      repository.findDomainById.mockResolvedValue(
        linkedField('field-2', AppleWatchMetric.SLEEP, 'hours'),
      );
      repository.updateDomain.mockResolvedValue(
        linkedField('field-2', AppleWatchMetric.SLEEP, 'minutes'),
      );

      // Act
      const result = await service.updateFieldAndBackfill('field-2', 'user-1', {
        appleWatchUnit: 'minutes',
      });

      // Assert
      expect(result.healthFilledDays).toBe(12);
      expect(linker.backfill).toHaveBeenCalledWith(
        'user-1',
        'field-2',
        AppleWatchMetric.SLEEP,
        'minutes',
      );
    });

    it('should not backfill when the update leaves the link as it is', async () => {
      // Arrange
      const unchanged = linkedField('field-2', AppleWatchMetric.STEPS, null);
      repository.findDomainById.mockResolvedValue(unchanged);
      repository.updateDomain.mockResolvedValue(unchanged);

      // Act
      const result = await service.updateFieldAndBackfill('field-2', 'user-1', {
        name: 'Pas du jour',
      });

      // Assert
      expect(result.healthFilledDays).toBeUndefined();
      expect(linker.backfill).not.toHaveBeenCalled();
      expect(userRepository.saveHealthLinkingState).not.toHaveBeenCalled();
    });

    it('should not backfill when the metric is removed', async () => {
      // Arrange
      repository.findDomainById.mockResolvedValue(
        linkedField('field-2', AppleWatchMetric.STEPS, null),
      );

      // Act
      const result = await service.updateFieldAndBackfill('field-2', 'user-1', {
        appleWatchMetric: null,
      });

      // Assert
      expect(result.healthFilledDays).toBeUndefined();
      expect(linker.backfill).not.toHaveBeenCalled();
    });
  });
});
