import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CustomFieldService } from './custom-field.service.js';
import { DailyLogService } from './daily-log.service.js';
import { FieldValueService } from './field-value.service.js';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { DailyLog } from '../../domain/entities/daily-log.entity.js';
import { FieldValue } from '../../domain/entities/field-value.entity.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import { BulkRowDto, BulkImportResponseDto } from '../dtos/bulk-import.dto.js';

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(
    private readonly customFieldService: CustomFieldService,
    private readonly dailyLogService: DailyLogService,
    private readonly fieldValueService: FieldValueService,
  ) {}

  private parseDate(dateStr: string): Date | null {
    if (!dateStr || !dateStr.trim()) return null;

    const trimmed = dateStr.trim();

    // Try ISO format (YYYY-MM-DD) first
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Fall back to French format (jour mois année)
    const monthsMap: Record<string, number> = {
      janvier: 0,
      février: 1,
      mars: 2,
      avril: 3,
      mai: 4,
      juin: 5,
      juillet: 6,
      août: 7,
      septembre: 8,
      octobre: 9,
      novembre: 10,
      décembre: 11,
    };

    const lowerTrimmed = trimmed.toLowerCase();
    const parts = lowerTrimmed.split(/\s+/);

    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = monthsMap[parts[1]];
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    return null;
  }

  async importRows(
    userId: string,
    rows: BulkRowDto[],
  ): Promise<BulkImportResponseDto> {
    let fieldsCreated = 0;
    let logsCreated = 0;
    let valuesCreated = 0;

    try {
      // Step 1: Load existing custom fields for this user
      const existingFields = await this.customFieldService.findByUserId(userId);
      const fieldMap = new Map<string, CustomField>();
      existingFields.forEach((f) => fieldMap.set(f.name, f));

      // Step 2: Get all field names from rows and ensure they exist
      const allFieldNames = new Set<string>();
      rows.forEach((row) => {
        Object.keys(row.fields || {}).forEach((name) => {
          if (name && name.trim()) {
            allFieldNames.add(name);
          }
        });
      });

      for (const fieldName of allFieldNames) {
        if (!fieldMap.has(fieldName)) {
          const newField = new CustomField(
            uuidv4(),
            userId,
            fieldName,
            FieldType.STRING,
            true,
            new Date(),
            new Date(),
            undefined,
          );
          const created = await this.customFieldService.createField(newField);
          fieldMap.set(fieldName, created);
          fieldsCreated++;
        }
      }

      // Step 3: Load existing daily logs for this user
      const existingLogs = await this.dailyLogService.findByUserId(userId);
      const logDateMap = new Map<string, DailyLog>();
      existingLogs.forEach((log) => {
        const dateKey = log.logDate.toISOString().split('T')[0];
        logDateMap.set(dateKey, log);
      });

      // Step 4: Process each row
      for (const row of rows) {
        const parsedDate = this.parseDate(row.date);
        if (!parsedDate) {
          this.logger.warn(`Skipping row with invalid date: ${row.date}`);
          continue;
        }

        const dateKey = parsedDate.toISOString().split('T')[0];
        let dailyLog = logDateMap.get(dateKey);

        // Create log if it doesn't exist
        if (!dailyLog) {
          dailyLog = new DailyLog(
            uuidv4(),
            userId,
            parsedDate,
            new Date(),
            new Date(),
            undefined,
          );
          dailyLog = await this.dailyLogService.createLog(dailyLog);
          logDateMap.set(dateKey, dailyLog);
          logsCreated++;
        }

        // Step 5: Save field values
        for (const [fieldName, value] of Object.entries(row.fields || {})) {
          if (!value || !value.trim()) {
            continue;
          }

          const field = fieldMap.get(fieldName);
          if (!field) {
            this.logger.warn(`Field ${fieldName} not found for value ${value}`);
            continue;
          }

          const fieldValue = new FieldValue(
            uuidv4(),
            dailyLog.id,
            field.id,
            value.trim(),
            new Date(),
            new Date(),
          );
          await this.fieldValueService.saveValue(fieldValue);
          valuesCreated++;
        }
      }

      return { logsCreated, fieldsCreated, valuesCreated };
    } catch (error) {
      this.logger.error({ error }, 'Error during bulk import');
      throw new BadRequestException(
        `Bulk import failed: ${(error as Error).message}`,
      );
    }
  }
}
