import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CustomFieldModel } from '../../../../database/models/custom-field.model.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { HealthDailyMetricRepository } from '../../../../database/repositories/health-daily-metric.repository.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import {
  HEALTH_METRIC_CATALOG,
  roundHealthValue,
} from '../../domain/services/health-metric-catalog.js';
import { convertHealthValue } from '../../domain/services/health-metric-units.js';
import {
  computeSleepNight,
  SleepStage,
  parseSleepInstant,
  parseSleepLines,
  SleepSample,
} from '../../domain/services/sleep-night.js';
import {
  HealthBatchDto,
  HealthBatchResult,
  MAX_SLEEP_SAMPLES,
} from '../dtos/health-batch.dto.js';
import { resolveSyncDate } from '../../domain/services/sync-date.js';
import { HealthSyncService } from './health-sync.service.js';
import { HealthLinkingAssistantService } from './health-linking-assistant.service.js';

const STAGE_METRICS: Record<SleepStage, AppleWatchMetric> = {
  deep: AppleWatchMetric.SLEEP_DEEP,
  rem: AppleWatchMetric.SLEEP_REM,
  core: AppleWatchMetric.SLEEP_CORE,
  awake: AppleWatchMetric.SLEEP_AWAKE,
};

/**
 * Receives a day of Apple Health data: every value is kept in the raw store, the fields
 * linked to a metric receive their value, and the linking assistant handles the metrics
 * that have no field yet. No field is ever created without the user.
 */
@Injectable()
export class HealthBatchSyncService {
  private readonly logger = new Logger(HealthBatchSyncService.name);

  constructor(
    @InjectRepository(CustomFieldModel)
    private readonly customFieldRepository: Repository<CustomFieldModel>,
    private readonly userRepository: UserRepository,
    private readonly healthSyncService: HealthSyncService,
    private readonly dailyMetricRepository: HealthDailyMetricRepository,
    private readonly linkingAssistant: HealthLinkingAssistantService,
  ) {}

  async sync(userId: string, dto: HealthBatchDto): Promise<HealthBatchResult> {
    const user = await this.userRepository.findById(userId);
    const date = resolveSyncDate(dto.date, user.timezone, new Date());
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

    const ignoredSleepLabels = this.addSleepReadings(
      dto,
      date,
      user.timezone,
      readings,
    );

    const result: HealthBatchResult = {
      success: true,
      stored: [],
      createdFields: [],
      linkedFields: [],
      ambiguousMetrics: [],
      ignoredSleepLabels,
      autoLinked: [],
      pendingCount: 0,
    };

    const rounded = new Map(
      [...readings].map(([metric, value]) => [
        metric,
        roundHealthValue(value, HEALTH_METRIC_CATALOG[metric].decimals),
      ]),
    );
    await this.dailyMetricRepository.upsertDay(userId, date, rounded);

    const linkedFields = rounded.size
      ? await this.customFieldRepository.find({
          where: { userId, appleWatchMetric: Not(IsNull()) },
        })
      : [];
    const fieldByMetric = new Map(
      linkedFields.map((field) => [field.appleWatchMetric, field]),
    );
    const dailyLog =
      fieldByMetric.size > 0
        ? await this.healthSyncService.findOrCreateDailyLog(
            userId,
            new Date(`${date}T00:00:00Z`),
          )
        : null;
    for (const [metric, nativeValue] of rounded) {
      const field = fieldByMetric.get(metric);
      if (!field || !dailyLog) continue;
      const value = convertHealthValue(
        metric,
        nativeValue,
        field.appleWatchUnit,
      );
      await this.healthSyncService.storeHealthValue(
        dailyLog.id,
        field.id,
        String(value),
        false,
      );
      result.stored.push({ metric, value });
    }

    // The assistant fills the fields it links from the raw store, today included
    const run = await this.linkingAssistant.run(userId);
    for (const linked of run.autoLinked) {
      result.autoLinked.push({
        metric: linked.metric,
        fieldName: linked.fieldName,
      });
      result.linkedFields.push(linked.metric);
      const nativeValue = rounded.get(linked.metric);
      if (nativeValue !== undefined) {
        result.stored.push({
          metric: linked.metric,
          value: convertHealthValue(linked.metric, nativeValue, linked.unit),
        });
      }
    }
    result.pendingCount = run.pendingCount;
    return result;
  }

  private addSleepReadings(
    dto: HealthBatchDto,
    date: string,
    timezone: string,
    readings: Map<AppleWatchMetric, number>,
  ): string[] {
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

    const samples: SleepSample[] = [];
    let malformed = 0;
    for (const sample of raw) {
      const start = parseSleepInstant(sample.start, timezone);
      const end = parseSleepInstant(sample.end, timezone);
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

    const night = computeSleepNight(samples, date, timezone);

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
    for (const stage of Object.keys(night.stages) as SleepStage[]) {
      const hours = night.stages[stage];
      if (hours !== undefined) readings.set(STAGE_METRICS[stage], hours);
    }
    return night.unknownLabels;
  }
}
