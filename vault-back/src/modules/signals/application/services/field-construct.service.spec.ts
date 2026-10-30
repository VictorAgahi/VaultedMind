import { jest } from '@jest/globals';
import type { EncryptionService } from '../../../../common/security/encryption.service.js';
import type { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import { AppleWatchMetric } from '../../../health/domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import type { JevClient } from '../../infrastructure/clients/jev.client.js';
import { FieldConstructService } from './field-construct.service.js';

const field = (
  id: string,
  name: string,
  extra: Partial<{
    constructNameHash: string;
    appleWatchMetric: AppleWatchMetric;
    isActive: boolean;
    fieldType: FieldType;
  }> = {},
): CustomField =>
  new CustomField(
    id,
    'user-1',
    name,
    extra.fieldType ?? FieldType.NUMBER,
    extra.isActive ?? true,
    new Date(),
    new Date(),
    undefined,
    undefined,
    false,
    undefined,
    undefined,
    extra.appleWatchMetric,
    undefined,
    undefined,
    undefined,
    undefined,
    extra.constructNameHash,
  );

describe('FieldConstructService', () => {
  let saveConstruct: jest.Mock<(...args: unknown[]) => Promise<void>>;
  let analyze: jest.Mock<JevClient['analyze']>;
  let configured: boolean;
  let service: FieldConstructService;

  beforeEach(() => {
    saveConstruct = jest
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue();
    analyze = jest.fn<JevClient['analyze']>();
    configured = true;
    const encryption = {
      createKeyedHash: (text: string, purpose: string) => `${purpose}|${text}`,
    } as unknown as EncryptionService;
    service = new FieldConstructService(
      { saveConstruct } as unknown as CustomFieldRepository,
      encryption,
      {
        analyze,
        isConfigured: () => configured,
      } as unknown as JevClient,
    );
  });

  it('should classify a new field and store the construct with its hash', async () => {
    // Arrange
    const humeur = field('f1', 'Humeur');
    analyze.mockResolvedValue({
      model: 'm',
      answers: {
        construct: {
          type: 'choice',
          choice: 'mood',
          confidence: 0.95,
          probabilities: {},
        },
      },
    });

    // Act
    const count = await service.classifyFields([humeur]);

    // Assert
    expect(count).toBe(1);
    expect(saveConstruct).toHaveBeenCalledWith(
      'f1',
      'mood',
      service.hashOf(humeur),
    );
  });

  it('should store other when the answer is not confident enough', async () => {
    // Arrange
    analyze.mockResolvedValue({
      model: 'm',
      answers: {
        construct: {
          type: 'choice',
          choice: 'mood',
          confidence: 0.2,
          probabilities: {},
        },
      },
    });

    // Act
    await service.classifyFields([field('f1', 'Truc')]);

    // Assert
    expect(saveConstruct).toHaveBeenCalledWith(
      'f1',
      'other',
      expect.any(String),
    );
  });

  it('should not ask again for a field whose description did not change, but ask after a rename', () => {
    // Arrange
    const upToDate = field('f1', 'Humeur');
    const classified = field('f1', 'Humeur', {
      constructNameHash: service.hashOf(upToDate),
    });
    const renamed = field('f1', 'Moral', {
      constructNameHash: service.hashOf(upToDate),
    });

    // Act / Assert
    expect(service.findFieldsToClassify([classified])).toHaveLength(0);
    expect(service.findFieldsToClassify([renamed])).toHaveLength(1);
  });

  it('should leave Apple Watch, inactive and date fields alone', () => {
    const fields = [
      field('a', 'Sommeil', { appleWatchMetric: AppleWatchMetric.SLEEP }),
      field('b', 'Vieux', { isActive: false }),
      field('c', 'Jour', { fieldType: FieldType.DATE }),
    ];
    expect(service.findFieldsToClassify(fields)).toEqual([]);
  });

  it('should do nothing when Jev is not configured', async () => {
    configured = false;
    expect(await service.classifyFields([field('f1', 'Humeur')])).toBe(0);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('should keep going when one classification fails', async () => {
    // Arrange
    analyze.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({
      model: 'm',
      answers: {
        construct: {
          type: 'choice',
          choice: 'sleep',
          confidence: 1,
          probabilities: {},
        },
      },
    });

    // Act
    const count = await service.classifyFields([
      field('f1', 'A'),
      field('f2', 'B'),
    ]);

    // Assert
    expect(count).toBe(1);
    expect(saveConstruct).toHaveBeenCalledTimes(1);
  });
});
