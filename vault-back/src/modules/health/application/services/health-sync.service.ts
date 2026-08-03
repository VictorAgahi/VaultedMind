import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { DailyLogModel } from '../../../../database/models/daily-log.model.js';
import { FieldValueModel } from '../../../../database/models/field-value.model.js';

@Injectable()
export class HealthSyncService {
  constructor(
    @InjectRepository(CustomFieldModel)
    private readonly customFieldRepository: Repository<CustomFieldModel>,
    @InjectRepository(DailyLogModel)
    private readonly dailyLogRepository: Repository<DailyLogModel>,
    @InjectRepository(FieldValueModel)
    private readonly fieldValueRepository: Repository<FieldValueModel>,
  ) {}

  async syncAppleWatchData(
    userId: string,
    metric: AppleWatchMetric,
    value: string | number,
    dateString: string,
  ): Promise<void> {
    // 1. Find the CustomField mapped to this metric for this user
    const customField = await this.customFieldRepository.findOne({
      where: { userId, appleWatchMetric: metric },
    });

    if (!customField) {
      // The user hasn't mapped this metric, we just ignore it silently
      // since Apple Shortcuts might send data they haven't configured in the app yet.
      return;
    }

    // Parse the date (assumes YYYY-MM-DD or ISO string)
    const logDate = new Date(dateString);
    if (isNaN(logDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    // Normalize to start of day for DailyLog
    const normalizedDate = new Date(
      Date.UTC(
        logDate.getUTCFullYear(),
        logDate.getUTCMonth(),
        logDate.getUTCDate(),
      ),
    );

    // 2. Find or create the DailyLog for this date
    let dailyLog = await this.dailyLogRepository.findOne({
      where: { userId, logDate: normalizedDate },
    });

    if (!dailyLog) {
      dailyLog = new DailyLogModel();
      dailyLog.userId = userId;
      dailyLog.logDate = normalizedDate;
      dailyLog = await this.dailyLogRepository.save(dailyLog);
    }

    // 3. Upsert the FieldValue
    let fieldValue = await this.fieldValueRepository.findOne({
      where: { dailyLogId: dailyLog.id, customFieldId: customField.id },
    });

    if (!fieldValue) {
      fieldValue = new FieldValueModel();
      fieldValue.dailyLogId = dailyLog.id;
      fieldValue.customFieldId = customField.id;
    }

    // Convert value to string and clean it up (Apple Shortcuts can send French commas and many decimals)
    let finalValue = String(value);
    
    // Attempt to normalize numbers
    if (finalValue.includes(',')) {
      finalValue = finalValue.replace(',', '.');
    }
    
    const numericValue = Number(finalValue);
    if (!isNaN(numericValue) && finalValue.trim() !== '') {
      // Round to 1 decimal place if it's a number (e.g. 7.45158 -> 7.5)
      finalValue = String(Math.round(numericValue * 10) / 10);
    }

    fieldValue.value = finalValue;

    await this.fieldValueRepository.save(fieldValue);
  }
}
