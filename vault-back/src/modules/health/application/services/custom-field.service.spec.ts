import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
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
    service = new CustomFieldService(repository as never);
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
    expect(repository.updateDomain).toHaveBeenCalledWith('field-2', updates);
  });

  it('should not touch other fields when the metric is removed', async () => {
    // Arrange / Act
    await service.updateField('field-2', 'user-1', { appleWatchMetric: null });

    // Assert
    expect(repository.clearAppleWatchMetric).not.toHaveBeenCalled();
    expect(repository.updateDomain).toHaveBeenCalledWith('field-2', {
      appleWatchMetric: null,
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
});
