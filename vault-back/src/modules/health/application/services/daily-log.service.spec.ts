import 'reflect-metadata';
import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DailyLogService } from './daily-log.service.js';
import { SaveDailyEntryDto } from '../dtos/daily-log.dto.js';
import { DailyLog } from '../../domain/entities/daily-log.entity.js';
import type { DailyEntry } from '../../domain/entities/daily-entry.js';
import type { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import type { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import type { CustomField } from '../../domain/entities/custom-field.entity.js';

const FIELD_ID = '8f4b6c1e-3d2a-4c5b-9a7e-1f2d3c4b5a69';

const entryWith = (source: unknown): object => ({
  logDate: '2026-10-31',
  values: [{ customFieldId: FIELD_ID, value: '6.5', source }],
});

const errorCount = (plain: object): number =>
  validateSync(plainToInstance(SaveDailyEntryDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).length;

describe('SaveDailyEntryDto source', () => {
  it('should accept the agent source and no source at all', () => {
    expect(errorCount(entryWith('agent'))).toBe(0);
    expect(errorCount(entryWith(undefined))).toBe(0);
    expect(errorCount(entryWith(null))).toBe(0);
  });

  it.each(['manual', 'AGENT', '', 1])(
    'should reject the source %p',
    (source) => {
      expect(errorCount(entryWith(source))).toBeGreaterThan(0);
    },
  );
});

describe('DailyLogService.saveEntry', () => {
  it('should hand the per-value source to the repository untouched', async () => {
    // Arrange
    const saved = new DailyLog(
      'log-1',
      'user-1',
      new Date(),
      new Date(),
      new Date(),
    );
    const saveEntry = jest
      .fn<(entry: DailyEntry) => Promise<DailyLog>>()
      .mockResolvedValue(saved);
    const service = new DailyLogService(
      { saveEntry } as unknown as DailyLogRepository,
      {
        findByUserId: jest
          .fn<() => Promise<CustomField[]>>()
          .mockResolvedValue([{ id: FIELD_ID } as CustomField]),
      } as unknown as CustomFieldRepository,
    );
    const entry: DailyEntry = {
      userId: 'user-1',
      logDate: '2026-10-31',
      values: [{ customFieldId: FIELD_ID, value: '6.5', source: 'agent' }],
      clearedFieldIds: [],
    };

    // Act
    const result = await service.saveEntry(entry);

    // Assert
    expect(result).toBe(saved);
    expect(saveEntry).toHaveBeenCalledWith(entry);
  });
});
