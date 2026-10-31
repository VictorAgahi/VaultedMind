import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import {
  APPLE_HEALTH_CATEGORY,
  HEALTH_METRIC_CATALOG,
  roundHealthValue,
} from '../../domain/services/health-metric-catalog.js';
import {
  computeSleepNight,
  parseSleepInstant,
  parseSleepLines,
  SleepSample,
} from '../../domain/services/sleep-night.js';
import {
  HealthBatchDto,
  HealthBatchResult,
  MAX_SLEEP_SAMPLES,
} from '../dtos/health-batch.dto.js';
import { HealthSyncService } from './health-sync.service.js';

const HOURLY_OPTION = 'isHourly';

@Injectable()
export class HealthBatchSyncService {
  private readonly logger = new Logger(HealthBatchSyncService.name);

  constructor(
    @InjectRepository(CustomFieldModel)
    private readonly customFieldRepository: Repository<CustomFieldModel>,
    private readonly userRepository: UserRepository,
    private readonly healthSyncService: HealthSyncService,
  ) {}

  async sync(userId: string, dto: HealthBatchDto): Promise<HealthBatchResult> {
    const readings = new Map<AppleWatchMetric, number>();
    for (const quantity of dto.quantities ?? []) {
      const { value } = quantity;
      if (value === undefined || value === null) continue;
      if (
        value <= 0 &&
        HEALTH_METRIC_CATALOG[quantity.metric].zeroMeansNoData
      ) {
        continue;
      }
      readings.set(quantity.metric, value);
    }

    const ignoredSleepLabels = await this.addSleepReadings(
      userId,
      dto,
      readings,
    );

    const result: HealthBatchResult = {
      success: true,
      stored: [],
      createdFields: [],
      ignoredSleepLabels,
    };
    if (readings.size === 0) return result;

    const dailyLog = await this.healthSyncService.findOrCreateDailyLog(
      userId,
      new Date(`${dto.date}T00:00:00Z`),
    );
    for (const [metric, rawValue] of readings) {
      const { field, created } = await this.findOrCreateField(userId, metric);
      const value = roundHealthValue(
        rawValue,
        HEALTH_METRIC_CATALOG[metric].decimals,
      );
      await this.healthSyncService.storeEncryptedValue(
        dailyLog.id,
        field.id,
        String(value),
      );
      result.stored.push({ metric, value });
      if (created) result.createdFields.push(metric);
    }
    return result;
  }

  private async addSleepReadings(
    userId: string,
    dto: HealthBatchDto,
    readings: Map<AppleWatchMetric, number>,
  ): Promise<string[]> {
    const raw = [
      ...(dto.sleepSamples ?? []),
      ...parseSleepLines(dto.sleepLines ?? ''),
    ];
    if (raw.length === 0) return [];
    if (raw.length > MAX_SLEEP_SAMPLES) {
      throw new BadRequestException(
        `At most ${MAX_SLEEP_SAMPLES} sleep samples are accepted`,
      );
    }

    const user = await this.userRepository.findById(userId);
    const samples: SleepSample[] = [];
    let malformed = 0;
    for (const sample of raw) {
      const start = parseSleepInstant(sample.start, user.timezone);
      const end = parseSleepInstant(sample.end, user.timezone);
      if (start && end) {
        samples.push({ value: sample.value, start, end });
      } else {
        malformed++;
      }
    }
    if (malformed > 0) {
      this.logger.warn(`Ignored ${malformed} sleep samples with a bad time`);
    }
    if (samples.length === 0) return [];

    const night = computeSleepNight(samples, dto.date, user.timezone);

    if (night.unknownSampleCount > 0) {
      this.logger.warn(
        `Ignored ${night.unknownSampleCount} sleep samples with unknown labels: ${night.unknownLabels.join(', ')}`,
      );
    }
    if (night.summary?.source === 'in_bed') {
      this.logger.warn('No asleep sample, sleep computed from in-bed time');
    }
    if (night.summary) {
      readings.set(AppleWatchMetric.SLEEP, night.summary.asleepHours);
      readings.set(AppleWatchMetric.BEDTIME, night.summary.bedtimeHour);
    }
    return night.unknownLabels;
  }

  private async findOrCreateField(
    userId: string,
    metric: AppleWatchMetric,
  ): Promise<{ field: CustomFieldModel; created: boolean }> {
    const existing = await this.customFieldRepository.findOne({
      where: { userId, appleWatchMetric: metric },
    });
    if (existing) return { field: existing, created: false };

    const definition = HEALTH_METRIC_CATALOG[metric];
    const sameName = await this.customFieldRepository.findOne({
      where: { userId, name: definition.name },
    });
    const field = this.customFieldRepository.create({
      userId,
      name: sameName ? `${definition.name} (Santé)` : definition.name,
      fieldType: FieldType.NUMBER,
      category: APPLE_HEALTH_CATEGORY,
      min: definition.min,
      max: definition.max,
      optionsOrder: definition.isClockTime ? [HOURLY_OPTION] : undefined,
      appleWatchMetric: metric,
    });
    return {
      field: await this.customFieldRepository.save(field),
      created: true,
    };
  }
}
