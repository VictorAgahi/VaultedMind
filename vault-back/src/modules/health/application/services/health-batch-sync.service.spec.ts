import { jest } from '@jest/globals';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { HealthBatchDto } from '../dtos/health-batch.dto.js';
import { HealthBatchSyncService } from './health-batch-sync.service.js';
import type { LinkingRunResult } from './health-linking-assistant.service.js';

type Readings = Map<AppleWatchMetric, number>;

describe('HealthBatchSyncService', () => {
  let fields: {
    find: jest.Mock<(options: object) => Promise<CustomFieldModel[]>>;
    save: jest.Mock<(field: CustomFieldModel) => Promise<CustomFieldModel>>;
  };
  let users: {
    findById: jest.Mock<(id: string) => Promise<{ timezone: string }>>;
  };
  let sync: {
    findOrCreateDailyLog: jest.Mock<
      (userId: string, date: Date) => Promise<{ id: string }>
    >;
    storeHealthValue: jest.Mock<
      (
        logId: string,
        fieldId: string,
        value: string,
        keepManual: boolean,
      ) => Promise<boolean>
    >;
  };
  let dailyMetrics: {
    upsertDay: jest.Mock<
      (userId: string, date: string, values: Readings) => Promise<void>
    >;
  };
  let assistant: {
    run: jest.Mock<(userId: string) => Promise<LinkingRunResult>>;
  };
  let service: HealthBatchSyncService;

  beforeEach(() => {
    fields = {
      find: jest
        .fn<(options: object) => Promise<CustomFieldModel[]>>()
        .mockResolvedValue([]),
      save: jest.fn<(field: CustomFieldModel) => Promise<CustomFieldModel>>(),
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
      storeHealthValue: jest
        .fn<
          (
            logId: string,
            fieldId: string,
            value: string,
            keepManual: boolean,
          ) => Promise<boolean>
        >()
        .mockResolvedValue(true),
    };
    dailyMetrics = {
      upsertDay: jest
        .fn<(userId: string, date: string, values: Readings) => Promise<void>>()
        .mockResolvedValue(undefined),
    };
    assistant = {
      run: jest
        .fn<(userId: string) => Promise<LinkingRunResult>>()
        .mockResolvedValue({ autoLinked: [], pendingCount: 0 }),
    };
    service = new HealthBatchSyncService(
      fields as never,
      users as never,
      sync as never,
      dailyMetrics as never,
      assistant as never,
    );
  });

  function dto(payload: Partial<HealthBatchDto>): HealthBatchDto {
    return { date: '2026-10-31', ...payload };
  }

  function linked(
    id: string,
    metric: AppleWatchMetric,
    appleWatchUnit: 'hours' | 'minutes' | null = null,
  ): CustomFieldModel {
    return { id, appleWatchMetric: metric, appleWatchUnit } as CustomFieldModel;
  }

  function storedReadings(): Readings {
    return dailyMetrics.upsertDay.mock.calls[0][2];
  }

  it('should keep every reading in the raw store and create no field', async () => {
    // Arrange
    const payload = dto({
      quantities: [{ metric: AppleWatchMetric.STEPS, value: 8042.46 }],
    });

    // Act
    const result = await service.sync('user-1', payload);

    // Assert
    expect(dailyMetrics.upsertDay).toHaveBeenCalledWith(
      'user-1',
      '2026-10-31',
      new Map([[AppleWatchMetric.STEPS, 8042.5]]),
    );
    expect(fields.save).not.toHaveBeenCalled();
    expect(sync.storeHealthValue).not.toHaveBeenCalled();
    expect(sync.findOrCreateDailyLog).not.toHaveBeenCalled();
    expect(result.stored).toEqual([]);
    expect(result.createdFields).toEqual([]);
  });

  it('should write a linked field with the health source, overwriting the synced day', async () => {
    // Arrange
    fields.find.mockResolvedValue([
      linked('steps-field', AppleWatchMetric.STEPS),
    ]);

    // Act
    const result = await service.sync(
      'user-1',
      dto({ quantities: [{ metric: AppleWatchMetric.STEPS, value: 10 }] }),
    );

    // Assert
    expect(sync.findOrCreateDailyLog).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-10-31T00:00:00Z'),
    );
    expect(sync.storeHealthValue).toHaveBeenCalledWith(
      'log-1',
      'steps-field',
      '10',
      false,
    );
    expect(result.stored).toEqual([
      { metric: AppleWatchMetric.STEPS, value: 10 },
    ]);
  });

  it('should convert a duration to the unit of the linked field', async () => {
    // Arrange
    fields.find.mockResolvedValue([
      linked('sleep-minutes', AppleWatchMetric.SLEEP, 'minutes'),
      linked('sport-hours', AppleWatchMetric.EXERCISE_MINUTES, 'hours'),
    ]);
    const payload = dto({
      quantities: [{ metric: AppleWatchMetric.EXERCISE_MINUTES, value: 45 }],
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
    expect(sync.storeHealthValue).toHaveBeenCalledWith(
      'log-1',
      'sleep-minutes',
      '420',
      false,
    );
    expect(sync.storeHealthValue).toHaveBeenCalledWith(
      'log-1',
      'sport-hours',
      '0.75',
      false,
    );
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: AppleWatchMetric.SLEEP, value: 420 },
        { metric: AppleWatchMetric.EXERCISE_MINUTES, value: 0.75 },
      ]),
    );
  });

  it('should report the links made by the assistant and the pending proposals', async () => {
    // Arrange
    assistant.run.mockResolvedValue({
      autoLinked: [
        {
          metric: AppleWatchMetric.STEPS,
          fieldId: 'f',
          fieldName: 'Nombre de pas',
          unit: null,
          filledDays: 3,
        },
      ],
      pendingCount: 2,
    });

    // Act
    const result = await service.sync(
      'user-1',
      dto({ quantities: [{ metric: AppleWatchMetric.STEPS, value: 4210 }] }),
    );

    // Assert
    expect(assistant.run).toHaveBeenCalledWith('user-1');
    expect(result.autoLinked).toEqual([
      { metric: AppleWatchMetric.STEPS, fieldName: 'Nombre de pas' },
    ]);
    expect(result.linkedFields).toEqual([AppleWatchMetric.STEPS]);
    expect(result.stored).toEqual([
      { metric: AppleWatchMetric.STEPS, value: 4210 },
    ]);
    expect(result.pendingCount).toBe(2);
  });

  it('should compute the night: total, bedtime and stages', async () => {
    // Arrange
    const payload = dto({
      sleepSamples: [
        {
          value: 'Deep',
          start: '2026-10-31T01:00:00+01:00',
          end: '2026-10-31T02:06:00+01:00',
        },
        {
          value: 'Core',
          start: '2026-10-31T02:06:00+01:00',
          end: '2026-10-31T07:00:00+01:00',
        },
      ],
    });

    // Act
    await service.sync('user-1', payload);

    // Assert
    const readings = storedReadings();
    expect(readings.get(AppleWatchMetric.SLEEP)).toBe(6);
    expect(readings.get(AppleWatchMetric.BEDTIME)).toBe(1);
    expect(readings.get(AppleWatchMetric.SLEEP_DEEP)).toBe(1.1);
    expect(readings.has(AppleWatchMetric.SLEEP_REM)).toBe(false);
  });

  it('should be idempotent: the same payload stores the same values', async () => {
    // Arrange
    fields.find.mockResolvedValue([
      linked('steps-field', AppleWatchMetric.STEPS),
    ]);
    const payload = dto({
      quantities: [{ metric: AppleWatchMetric.STEPS, value: 100 }],
    });

    // Act
    const first = await service.sync('user-1', payload);
    const second = await service.sync('user-1', payload);

    // Assert
    expect(second.stored).toEqual(first.stored);
    expect(dailyMetrics.upsertDay.mock.calls[1]).toEqual(
      dailyMetrics.upsertDay.mock.calls[0],
    );
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
    expect(storedReadings().size).toBe(0);
    expect(sync.findOrCreateDailyLog).not.toHaveBeenCalled();
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
    await service.sync('user-1', payload);

    // Assert (October 31 2026 is CET again after the change: UTC+1)
    const readings = storedReadings();
    expect(readings.get(AppleWatchMetric.SLEEP)).toBe(7);
    expect(readings.get(AppleWatchMetric.BEDTIME)).toBe(23.5);
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
    await service.sync('user-1', payload);

    // Assert
    expect(storedReadings()).toEqual(new Map([[AppleWatchMetric.STEPS, 0]]));
  });

  it('should refuse more sleep samples than the maximum', async () => {
    // Arrange
    const line = 'Core|2026-10-31T01:00:00+01:00|2026-10-31T02:00:00+01:00';
    const payload = dto({ sleepLines: Array(501).fill(line).join('\n') });

    // Act
    const attempt = service.sync('user-1', payload);

    // Assert
    await expect(attempt).rejects.toThrow('At most 500 sleep samples');
    expect(dailyMetrics.upsertDay).not.toHaveBeenCalled();
  });
});
