import { jest } from '@jest/globals';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import { HealthBatchDto } from '../dtos/health-batch.dto.js';
import { HealthBatchSyncService } from './health-batch-sync.service.js';

describe('HealthBatchSyncService', () => {
  let fields: {
    findOne: jest.Mock<(options: object) => Promise<CustomFieldModel | null>>;
    create: jest.Mock<(data: Partial<CustomFieldModel>) => CustomFieldModel>;
    save: jest.Mock<(field: CustomFieldModel) => Promise<CustomFieldModel>>;
  };
  let users: {
    findById: jest.Mock<(id: string) => Promise<{ timezone: string }>>;
  };
  let sync: {
    findOrCreateDailyLog: jest.Mock<
      (userId: string, date: Date) => Promise<{ id: string }>
    >;
    storeEncryptedValue: jest.Mock<
      (logId: string, fieldId: string, value: string) => Promise<void>
    >;
  };
  let service: HealthBatchSyncService;

  beforeEach(() => {
    fields = {
      findOne: jest
        .fn<(options: object) => Promise<CustomFieldModel | null>>()
        .mockResolvedValue(null),
      create: jest.fn(
        (data: Partial<CustomFieldModel>) => data as CustomFieldModel,
      ),
      save: jest.fn((field: CustomFieldModel) =>
        Promise.resolve({
          ...field,
          id: `field-${field.appleWatchMetric}`,
        }),
      ),
    };
    users = {
      findById: jest
        .fn<(id: string) => Promise<{ timezone: string }>>()
        .mockResolvedValue({ timezone: 'Europe/Paris' }),
    };
    sync = {
      findOrCreateDailyLog: jest
        .fn<(userId: string, date: Date) => Promise<{ id: string }>>()
        .mockResolvedValue({ id: 'log-1' }),
      storeEncryptedValue: jest
        .fn<(logId: string, fieldId: string, value: string) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    service = new HealthBatchSyncService(
      fields as never,
      users as never,
      sync as never,
    );
  });

  function dto(payload: Partial<HealthBatchDto>): HealthBatchDto {
    return { date: '2026-10-31', ...payload };
  }

  it('should create the missing field and store the rounded value through the encrypted path', async () => {
    // Arrange
    const payload = dto({
      quantities: [{ metric: AppleWatchMetric.STEPS, value: 8042.46 }],
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert
    expect(fields.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        name: 'Pas',
        category: 'Apple Santé',
        fieldType: FieldType.NUMBER,
        appleWatchMetric: AppleWatchMetric.STEPS,
      }),
    );
    expect(sync.findOrCreateDailyLog).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-10-31T00:00:00Z'),
    );
    expect(sync.storeEncryptedValue).toHaveBeenCalledWith(
      'log-1',
      'field-STEPS',
      '8042.5',
    );
    expect(result.stored).toEqual([
      { metric: AppleWatchMetric.STEPS, value: 8042.5 },
    ]);
    expect(result.createdFields).toEqual([AppleWatchMetric.STEPS]);
  });

  it('should reuse an existing mapped field without creating one', async () => {
    // Arrange
    fields.findOne.mockResolvedValue({ id: 'existing' } as CustomFieldModel);

    // Act
    const result = await service.sync(
      'user-1',
      dto({ quantities: [{ metric: AppleWatchMetric.STEPS, value: 10 }] }),
    );

    // Assert
    expect(fields.save).not.toHaveBeenCalled();
    expect(sync.storeEncryptedValue).toHaveBeenCalledWith(
      'log-1',
      'existing',
      '10',
    );
    expect(result.createdFields).toEqual([]);
  });

  it('should create the bedtime field as an hourly number', async () => {
    // Arrange
    const payload = dto({
      sleepSamples: [
        {
          value: 'Core',
          start: '2026-10-30T23:30:00+01:00',
          end: '2026-10-31T06:30:00+01:00',
        },
      ],
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert
    expect(fields.save).toHaveBeenCalledWith(
      expect.objectContaining({
        appleWatchMetric: AppleWatchMetric.BEDTIME,
        optionsOrder: ['isHourly'],
      }),
    );
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: AppleWatchMetric.SLEEP, value: 7 },
        { metric: AppleWatchMetric.BEDTIME, value: 23.5 },
      ]),
    );
  });

  it('should be idempotent: the same payload stores the same values', async () => {
    // Arrange
    const payload = dto({
      quantities: [{ metric: AppleWatchMetric.STEPS, value: 100 }],
      sleepSamples: [
        {
          value: 'Asleep',
          start: '2026-10-31T00:00:00+01:00',
          end: '2026-10-31T06:00:00+01:00',
        },
      ],
    });

    // Act
    const first = await service.sync('user-1', payload);
    const second = await service.sync('user-1', payload);

    // Assert
    expect(second.stored).toEqual(first.stored);
  });

  it('should report ignored sleep labels and store nothing when no night is found', async () => {
    // Arrange
    const payload = dto({
      sleepSamples: [
        {
          value: 'Mystery',
          start: '2026-10-31T00:00:00+01:00',
          end: '2026-10-31T06:00:00+01:00',
        },
      ],
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert
    expect(result.ignoredSleepLabels).toEqual(['Mystery']);
    expect(result.stored).toEqual([]);
    expect(sync.findOrCreateDailyLog).not.toHaveBeenCalled();
  });

  it('should not clash with an unrelated field of the same name', async () => {
    // Arrange
    fields.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other' } as CustomFieldModel);

    // Act
    await service.sync(
      'user-1',
      dto({ quantities: [{ metric: AppleWatchMetric.STEPS, value: 1 }] }),
    );

    // Assert
    expect(fields.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Pas (Santé)' }),
    );
  });

  it('should read the sleep sent as text lines, with or without a UTC offset', async () => {
    // Arrange
    const payload = dto({
      sleepLines: [
        'Core|2026-10-30T23:30:00|2026-10-31T06:30:00',
        'InBed|2026-10-30T23:00:00+01:00|2026-10-31T07:00:00+01:00',
        'not a line',
      ].join('\n'),
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert (October 31 2026 is CET again after the change: UTC+1)
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: AppleWatchMetric.SLEEP, value: 7 },
        { metric: AppleWatchMetric.BEDTIME, value: 23.5 },
      ]),
    );
  });

  it('should skip empty readings and zero averages but keep a zero sum', async () => {
    // Arrange
    const payload = dto({
      quantities: [
        { metric: AppleWatchMetric.RESTING_HEART_RATE, value: 0 },
        { metric: AppleWatchMetric.HEART_RATE_VARIABILITY, value: null },
        { metric: AppleWatchMetric.RESPIRATORY_RATE },
        { metric: AppleWatchMetric.STEPS, value: 0 },
      ],
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert
    expect(result.stored).toEqual([
      { metric: AppleWatchMetric.STEPS, value: 0 },
    ]);
  });

  it('should refuse more sleep samples than the maximum', async () => {
    // Arrange
    const line = 'Core|2026-10-31T01:00:00+01:00|2026-10-31T02:00:00+01:00';
    const payload = dto({ sleepLines: Array(501).fill(line).join('\n') });

    // Act
    const attempt = service.sync('user-1', payload);

    // Assert
    await expect(attempt).rejects.toThrow('At most 500 sleep samples');
  });
});
