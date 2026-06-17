import { Test, TestingModule } from '@nestjs/testing';
import { DataSanitizerService } from './data-sanitizer.service.js';
import { DailyLog } from '../../../health/domain/entities/daily-log.entity.js';
import { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import { FieldValue } from '../../../health/domain/entities/field-value.entity.js';

describe('DataSanitizerService', () => {
  let service: DataSanitizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSanitizerService],
    }).compile();

    service = module.get<DataSanitizerService>(DataSanitizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeLogsForAI', () => {
    it('should return empty dailyEntries if no logs are provided', () => {
      const result = service.sanitizeLogsForAI([], []);
      expect(result.dailyEntries).toEqual([]);
      expect(result.totalLogs).toBe(0);
    });

    it('should structure daily entries chronologically with fields and notes', () => {
      const fieldSleep = new CustomField(
        'field-sleep-id',
        'user-id',
        'Sommeil',
        FieldType.NUMBER,
        true,
        new Date(),
        new Date(),
      );

      const fieldMigraine = new CustomField(
        'field-migraine-id',
        'user-id',
        'Migraine',
        FieldType.BOOLEAN,
        true,
        new Date(),
        new Date(),
      );

      const log1 = new DailyLog(
        'log-1',
        'user-id',
        new Date('2026-06-10'),
        new Date(),
        new Date(),
        'Mal à la tête ce matin',
        [
          new FieldValue(
            'val-1',
            'log-1',
            'field-sleep-id',
            '6.5',
            new Date(),
            new Date(),
          ),
          new FieldValue(
            'val-2',
            'log-1',
            'field-migraine-id',
            'true',
            new Date(),
            new Date(),
          ),
        ],
      );

      const log2 = new DailyLog(
        'log-2',
        'user-id',
        new Date('2026-06-11'),
        new Date(),
        new Date(),
        'Super forme aujourdhui',
        [
          new FieldValue(
            'val-3',
            'log-2',
            'field-sleep-id',
            '8',
            new Date(),
            new Date(),
          ),
          new FieldValue(
            'val-4',
            'log-2',
            'field-migraine-id',
            'false',
            new Date(),
            new Date(),
          ),
        ],
      );

      // Pass logs unsorted to ensure they get sorted chronologically
      const result = service.sanitizeLogsForAI(
        [log2, log1],
        [fieldSleep, fieldMigraine],
      );

      expect(result.totalLogs).toBe(2);
      expect(result.dailyEntries.length).toBe(2);

      // First entry should be log1 (2026-06-10)
      const entry1 = result.dailyEntries[0];
      expect(entry1.notes).toBe('Mal à la tête ce matin');
      expect(entry1.fieldValues).toContainEqual({
        fieldName: 'Sommeil',
        value: '6.5',
        fieldType: FieldType.NUMBER,
      });
      expect(entry1.fieldValues).toContainEqual({
        fieldName: 'Migraine',
        value: 'true',
        fieldType: FieldType.BOOLEAN,
      });

      // Second entry should be log2 (2026-06-11)
      const entry2 = result.dailyEntries[1];
      expect(entry2.notes).toBe('Super forme aujourdhui');
      expect(entry2.fieldValues).toContainEqual({
        fieldName: 'Sommeil',
        value: '8',
        fieldType: FieldType.NUMBER,
      });
      expect(entry2.fieldValues).toContainEqual({
        fieldName: 'Migraine',
        value: 'false',
        fieldType: FieldType.BOOLEAN,
      });
    });
  });
});
