import { Injectable } from '@nestjs/common';
import { DailyLog } from '../../../health/domain/entities/daily-log.entity.js';
import { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';

interface SanitizedData {
  dateRange: string;
  totalLogs: number;
  fieldSummaries: Array<{
    fieldName: string;
    fieldType: string;
    avgValue?: number;
    trend?: string;
    values?: string[];
  }>;
  lastEntryDate?: string;
}

@Injectable()
export class DataSanitizerService {
  sanitizeLogsForAI(logs: DailyLog[], fields: CustomField[]): SanitizedData {
    if (!logs || logs.length === 0) {
      return {
        dateRange: 'No data',
        totalLogs: 0,
        fieldSummaries: [],
      };
    }

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime(),
    );

    const minDate = new Date(sortedLogs[0].logDate);
    const maxDate = new Date(sortedLogs[sortedLogs.length - 1].logDate);

    const fieldSummaries: SanitizedData['fieldSummaries'] = [];

    for (const field of fields) {
      if (!field.isActive) continue;

      const values: string[] = [];
      const numericValues: number[] = [];

      for (const log of sortedLogs) {
        const fieldValue = log.fieldValues?.find(
          (fv) => fv.customFieldId === field.id,
        );
        if (!fieldValue) continue;

        values.push(fieldValue.value);

        if (field.fieldType === FieldType.NUMBER) {
          const num = parseFloat(fieldValue.value);
          if (!isNaN(num)) numericValues.push(num);
        }
      }

      if (values.length === 0) continue;

      const summary: SanitizedData['fieldSummaries'][0] = {
        fieldName: field.name,
        fieldType: field.fieldType,
      };

      if (field.fieldType === FieldType.NUMBER && numericValues.length > 0) {
        const avg =
          numericValues.reduce((a, b) => a + b) / numericValues.length;
        summary.avgValue = parseFloat(avg.toFixed(2));

        if (numericValues.length >= 2) {
          const recent = numericValues.slice(-3);
          const older = numericValues.slice(0, 3);
          const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b) / older.length;
          const change = (((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);
          summary.trend = `${change}%`;
        }
      } else if (field.fieldType === FieldType.STRING) {
        summary.values = [...new Set(values)].slice(0, 5);
      } else if (field.fieldType === FieldType.BOOLEAN) {
        const trueCount = values.filter((v) => v === 'true').length;
        const percentage = ((trueCount / values.length) * 100).toFixed(0);
        summary.values = [
          `Yes: ${percentage}%, No: ${100 - parseInt(percentage)}%`,
        ];
      }

      fieldSummaries.push(summary);
    }

    return {
      dateRange: `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`,
      totalLogs: logs.length,
      fieldSummaries,
      lastEntryDate: maxDate.toLocaleDateString(),
    };
  }
}
