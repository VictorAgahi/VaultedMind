import { jest } from '@jest/globals';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldValueModel } from '../../../../database/models/field-value.model.js';
import { HealthFieldLinkerService } from './health-field-linker.service.js';
import { HealthSyncService } from './health-sync.service.js';

describe('HealthFieldLinkerService', () => {
  /** Field values by daily log id, as stored. */
  let values: Map<string, FieldValueModel>;
  let syncService: HealthSyncService;
  let clearAppleWatchMetric: jest.Mock<() => Promise<void>>;
  let updateDomain: jest.Mock<(id: string, updates: object) => Promise<object>>;
  let service: HealthFieldLinkerService;

  function value(
    dailyLogId: string,
    plain: string,
    source: 'agent' | 'health' | null,
  ): FieldValueModel {
    const model = new FieldValueModel();
    model.dailyLogId = dailyLogId;
    model.customFieldId = 'field-1';
    model.value = `enc:${plain}`;
    model.source = source;
    return model;
  }

  beforeEach(() => {
    values = new Map([
      ['log-2026-10-29', value('log-2026-10-29', '6', null)],
      ['log-2026-10-30', value('log-2026-10-30', '5', 'health')],
      ['log-2026-10-31', value('log-2026-10-31', '7', 'agent')],
    ]);
    const fieldValueRepository = {
      findOne: ({ where }: { where: { dailyLogId: string } }) =>
        Promise.resolve(values.get(where.dailyLogId) ?? null),
      save: (model: FieldValueModel) => {
        values.set(model.dailyLogId, model);
        return Promise.resolve(model);
      },
    };
    const dailyLogRepository = {
      findOne: ({ where }: { where: { logDate: Date } }) =>
        Promise.resolve({
          id: `log-${where.logDate.toISOString().slice(0, 10)}`,
        }),
    };
    syncService = new HealthSyncService(
      {} as never,
      dailyLogRepository as never,
      fieldValueRepository as never,
      { encrypt: (plain: string) => `enc:${plain}` } as never,
    );
    clearAppleWatchMetric = jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);
    updateDomain = jest
      .fn<(id: string, updates: object) => Promise<object>>()
      .mockImplementation((id) => Promise.resolve({ id, name: 'Sommeil' }));
    service = new HealthFieldLinkerService(
      { clearAppleWatchMetric, updateDomain } as never,
      {
        findByMetric: () =>
          Promise.resolve(
            ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map(
              (logDate) => ({
                logDate,
                metric: AppleWatchMetric.SLEEP,
                value: 7.5,
              }),
            ),
          ),
      } as never,
      syncService,
    );
  });

  it('should link the field, then fill only empty days and days filled by the sync', async () => {
    // Arrange / Act
    const result = await service.link(
      'user-1',
      'field-1',
      AppleWatchMetric.SLEEP,
      'minutes',
    );

    // Assert
    expect(clearAppleWatchMetric).toHaveBeenCalledWith(
      'user-1',
      AppleWatchMetric.SLEEP,
      'field-1',
    );
    expect(updateDomain).toHaveBeenCalledWith('field-1', {
      appleWatchMetric: AppleWatchMetric.SLEEP,
      appleWatchUnit: 'minutes',
    });
    expect(result.filledDays).toBe(2);
    expect(values.get('log-2026-10-28')).toMatchObject({
      value: 'enc:450',
      source: 'health',
    });
    expect(values.get('log-2026-10-30')).toMatchObject({
      value: 'enc:450',
      source: 'health',
    });
    expect(values.get('log-2026-10-29')).toMatchObject({
      value: 'enc:6',
      source: null,
    });
    expect(values.get('log-2026-10-31')).toMatchObject({
      value: 'enc:7',
      source: 'agent',
    });
  });

  it('should overwrite a manual value only when asked, for the synced day', async () => {
    // Arrange / Act
    const written = await syncService.storeHealthValue(
      'log-2026-10-29',
      'field-1',
      '8',
      false,
    );

    // Assert
    expect(written).toBe(true);
    expect(values.get('log-2026-10-29')).toMatchObject({
      value: 'enc:8',
      source: 'health',
    });
  });
});
