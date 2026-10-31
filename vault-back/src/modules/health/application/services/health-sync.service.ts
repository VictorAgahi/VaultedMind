import {
  Injectable,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { DailyLogModel } from '../../../../database/models/daily-log.model.js';
import { FieldValueModel } from '../../../../database/models/field-value.model.js';
import { canFillFromHealth } from '../../domain/services/health-backfill.js';

@Injectable()
export class HealthSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HealthSyncService.name);

  constructor(
    @InjectRepository(CustomFieldModel)
    private readonly customFieldRepository: Repository<CustomFieldModel>,
    @InjectRepository(DailyLogModel)
    private readonly dailyLogRepository: Repository<DailyLogModel>,
    @InjectRepository(FieldValueModel)
    private readonly fieldValueRepository: Repository<FieldValueModel>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.encryptLegacyPlaintextValues();
    } catch (error) {
      this.logger.error(
        'Could not encrypt legacy Apple Watch values',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Values synced before the sync encrypted them were stored in plain text.
   * Encrypts every Apple Watch value that does not decrypt; idempotent.
   */
  async encryptLegacyPlaintextValues(): Promise<number> {
    const values = await this.fieldValueRepository.find({
      where: { customField: { appleWatchMetric: Not(IsNull()) } },
      relations: { customField: true },
    });
    let encrypted = 0;
    for (const fieldValue of values) {
      if (!fieldValue.value || this.isEncrypted(fieldValue.value)) continue;
      await this.fieldValueRepository.update(fieldValue.id, {
        value: this.encryptionService.encrypt(fieldValue.value),
      });
      encrypted++;
    }
    if (encrypted > 0) {
      this.logger.log(`Encrypted ${encrypted} legacy Apple Watch values`);
    }
    return encrypted;
  }

  private isEncrypted(value: string): boolean {
    try {
      this.encryptionService.decrypt(value);
      return true;
    } catch {
      return false;
    }
  }

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

    const dailyLog = await this.findOrCreateDailyLog(userId, logDate);

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

    await this.storeEncryptedValue(dailyLog.id, customField.id, finalValue);
  }

  /** The daily log of a calendar day (the time of day of `logDate` is ignored). */
  async findOrCreateDailyLog(
    userId: string,
    logDate: Date,
  ): Promise<DailyLogModel> {
    const normalizedDate = new Date(
      Date.UTC(
        logDate.getUTCFullYear(),
        logDate.getUTCMonth(),
        logDate.getUTCDate(),
      ),
    );

    const existing = await this.dailyLogRepository.findOne({
      where: { userId, logDate: normalizedDate },
    });
    if (existing) return existing;

    const dailyLog = new DailyLogModel();
    dailyLog.userId = userId;
    dailyLog.logDate = normalizedDate;
    return this.dailyLogRepository.save(dailyLog);
  }

  /** Upserts the value of a field for a daily log; values are always encrypted at rest. */
  async storeEncryptedValue(
    dailyLogId: string,
    customFieldId: string,
    value: string,
  ): Promise<void> {
    let fieldValue = await this.fieldValueRepository.findOne({
      where: { dailyLogId, customFieldId },
    });

    if (!fieldValue) {
      fieldValue = new FieldValueModel();
      fieldValue.dailyLogId = dailyLogId;
      fieldValue.customFieldId = customFieldId;
    }

    fieldValue.value = this.encryptionService.encrypt(value);

    await this.fieldValueRepository.save(fieldValue);
  }

  /**
   * Writes a value received from Apple Health, marked with the 'health' source. With
   * `keepManual`, a day where the user entered the value keeps it (see canFillFromHealth).
   * Returns whether the value was written.
   */
  async storeHealthValue(
    dailyLogId: string,
    customFieldId: string,
    value: string,
    keepManual: boolean,
  ): Promise<boolean> {
    const existing = await this.fieldValueRepository.findOne({
      where: { dailyLogId, customFieldId },
    });
    if (keepManual && !canFillFromHealth(existing)) return false;

    const fieldValue = existing ?? new FieldValueModel();
    fieldValue.dailyLogId = dailyLogId;
    fieldValue.customFieldId = customFieldId;
    fieldValue.value = this.encryptionService.encrypt(value);
    fieldValue.source = 'health';
    await this.fieldValueRepository.save(fieldValue);
    return true;
  }
}
