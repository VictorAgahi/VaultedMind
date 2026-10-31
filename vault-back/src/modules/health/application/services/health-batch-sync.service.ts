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
  findFieldsMatchingMetric,
  LinkableField,
} from '../../domain/services/health-field-matching.js';
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

const HOURLY_OPTION = 'isHourly';

const STAGE_METRICS: Record<SleepStage, AppleWatchMetric> = {
  deep: AppleWatchMetric.SLEEP_DEEP,
  rem: AppleWatchMetric.SLEEP_REM,
  core: AppleWatchMetric.SLEEP_CORE,
  awake: AppleWatchMetric.SLEEP_AWAKE,
};

interface FieldResolution {
  field: CustomFieldModel;
  outcome: 'existing' | 'linked' | 'created';
  ambiguous: boolean;
}

interface LinkCandidate extends LinkableField {
  model: CustomFieldModel;
}

/** The user's unmapped number fields, loaded once per sync and only if needed. */
class LinkableFieldPool {
  private candidates: LinkCandidate[] | null = null;

  constructor(private readonly load: () => Promise<CustomFieldModel[]>) {}

  async list(): Promise<LinkCandidate[]> {
    this.candidates ??= (await this.load())
      .filter((field) => !field.appleWatchMetric)
      .map((model) => ({
        id: model.id,
        name: model.name,
        isHourly: (model.optionsOrder ?? []).includes(HOURLY_OPTION),
        model,
      }));
    return this.candidates;
  }

  take(id: string): void {
    this.candidates = (this.candidates ?? []).filter(
      (candidate) => candidate.id !== id,
    );
  }
}

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
    };
    if (readings.size === 0) return result;

    const dailyLog = await this.healthSyncService.findOrCreateDailyLog(
      userId,
      new Date(`${date}T00:00:00Z`),
    );
    const pool = new LinkableFieldPool(() =>
      this.customFieldRepository.find({
        where: { userId, isActive: true, fieldType: FieldType.NUMBER },
      }),
    );
    for (const [metric, rawValue] of readings) {
      const { field, outcome, ambiguous } = await this.resolveField(
        userId,
        metric,
        pool,
      );
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
      if (outcome === 'created') result.createdFields.push(metric);
      if (outcome === 'linked') result.linkedFields.push(metric);
      if (ambiguous) result.ambiguousMetrics.push(metric);
    }
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

  private async resolveField(
    userId: string,
    metric: AppleWatchMetric,
    pool: LinkableFieldPool,
  ): Promise<FieldResolution> {
    const existing = await this.customFieldRepository.findOne({
      where: { userId, appleWatchMetric: metric },
    });
    if (existing) {
      return { field: existing, outcome: 'existing', ambiguous: false };
    }

    const matches = findFieldsMatchingMetric(metric, await pool.list());
    if (matches.length === 1) {
      const model = matches[0].model;
      model.appleWatchMetric = metric;
      const linked = await this.customFieldRepository.save(model);
      pool.take(linked.id);
      return { field: linked, outcome: 'linked', ambiguous: false };
    }
    if (matches.length > 1) {
      this.logger.warn(
        `${matches.length} existing fields match ${metric}: a new field is created`,
      );
    }
    return {
      field: await this.createField(userId, metric),
      outcome: 'created',
      ambiguous: matches.length > 1,
    };
  }

  private async createField(
    userId: string,
    metric: AppleWatchMetric,
  ): Promise<CustomFieldModel> {
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
    return this.customFieldRepository.save(field);
  }
}
