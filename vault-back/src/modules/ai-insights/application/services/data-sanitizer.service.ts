import { Injectable } from '@nestjs/common';
import { DailyLog } from '../../../health/domain/entities/daily-log.entity.js';
import { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';

type SanitizedValueKind =
  | 'duration'
  | 'date'
  | 'numeric'
  | 'categorical'
  | 'boolean';

interface DailyEntry {
  date: string;
  notes?: string;
  fieldValues: Array<{
    fieldName: string;
    value: string;
    fieldType: string;
  }>;
}

interface SanitizedData {
  dateRange: string;
  totalLogs: number;
  fieldSummaries: Array<{
    fieldName: string;
    fieldType: string;
    valueKind?: SanitizedValueKind;
    avgValue?: number;
    displayAvgValue?: string;
    trend?: string;
    values?: string[];
  }>;
  dailyEntries: DailyEntry[];
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
        dailyEntries: [],
      };
    }

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime(),
    );

    const minDate = new Date(sortedLogs[0].logDate);
    const maxDate = new Date(sortedLogs[sortedLogs.length - 1].logDate);
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

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

      const valueKind = this.resolveValueKind(field);

      const summary: SanitizedData['fieldSummaries'][0] = {
        fieldName: field.name,
        fieldType: field.fieldType,
        valueKind,
      };

      if (field.fieldType === FieldType.NUMBER && numericValues.length > 0) {
        const avg =
          numericValues.reduce((a, b) => a + b) / numericValues.length;
        summary.avgValue = parseFloat(avg.toFixed(2));
        summary.displayAvgValue = this.formatNumericValue(avg, valueKind);

        if (numericValues.length >= 2) {
          const recent = numericValues.slice(-3);
          const older = numericValues.slice(0, 3);
          const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b) / older.length;
          if (olderAvg !== 0) {
            const change = (((recentAvg - olderAvg) / olderAvg) * 100).toFixed(
              1,
            );
            summary.trend = `${change}%`;
          }
        }
      } else if (field.fieldType === FieldType.STRING) {
        summary.values = [...new Set(values)].slice(0, 5);
        summary.valueKind = 'categorical';
      } else if (field.fieldType === FieldType.BOOLEAN) {
        const trueCount = values.filter((v) => v === 'true').length;
        const percentage = ((trueCount / values.length) * 100).toFixed(0);
        summary.values = [
          `Oui: ${percentage}%, Non: ${100 - parseInt(percentage, 10)}%`,
        ];
        summary.valueKind = 'boolean';
      } else if (field.fieldType === FieldType.DATE) {
        summary.values = [...new Set(values)]
          .map((value) => this.formatDateValue(value, dateFormatter))
          .slice(0, 5);
        summary.valueKind = 'date';
      }

      fieldSummaries.push(summary);
    }

    const dailyEntries: DailyEntry[] = [];
    for (const log of sortedLogs) {
      const entryFieldValues: Array<{
        fieldName: string;
        value: string;
        fieldType: string;
      }> = [];

      for (const field of fields) {
        if (!field.isActive) continue;

        const fieldValue = log.fieldValues?.find(
          (fv) => fv.customFieldId === field.id,
        );
        if (fieldValue) {
          entryFieldValues.push({
            fieldName: field.name,
            value: fieldValue.value,
            fieldType: field.fieldType,
          });
        }
      }

      dailyEntries.push({
        date: dateFormatter.format(new Date(log.logDate)),
        notes: log.notes || undefined,
        fieldValues: entryFieldValues,
      });
    }

    return {
      dateRange: `${dateFormatter.format(minDate)} au ${dateFormatter.format(maxDate)}`,
      totalLogs: logs.length,
      fieldSummaries,
      dailyEntries,
      lastEntryDate: dateFormatter.format(maxDate),
    };
  }

  private resolveValueKind(field: CustomField): SanitizedValueKind {
    if (field.fieldType === FieldType.DATE) {
      return 'date';
    }

    if (field.fieldType === FieldType.BOOLEAN) {
      return 'boolean';
    }

    if (
      field.fieldType === FieldType.NUMBER &&
      this.looksLikeDurationField(field.name)
    ) {
      return 'duration';
    }

    if (field.fieldType === FieldType.NUMBER) {
      return 'numeric';
    }

    return 'categorical';
  }

  private looksLikeDurationField(fieldName: string): boolean {
    const normalizedName = fieldName
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

    return /\b(heure|heures|hour|hours|duration|duree|temps|time|min|minutes|sleep|sommeil|nap|sieste)\b/u.test(
      normalizedName,
    );
  }

  private formatNumericValue(
    value: number,
    valueKind: SanitizedValueKind,
  ): string {
    if (valueKind !== 'duration') {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    const absoluteValue = Math.abs(value);
    const hours = Math.floor(absoluteValue);
    const minutes = Math.round((absoluteValue - hours) * 60);
    const normalizedMinutes = minutes === 60 ? 0 : minutes;
    const normalizedHours = minutes === 60 ? hours + 1 : hours;
    const formattedDuration =
      normalizedMinutes === 0
        ? `${normalizedHours}h`
        : `${normalizedHours}h${normalizedMinutes.toString().padStart(2, '0')}`;

    return value < 0 ? `-${formattedDuration}` : formattedDuration;
  }

  private formatDateValue(
    value: string,
    formatter: Intl.DateTimeFormat,
  ): string {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return formatter.format(parsedDate);
  }
}
