import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { HealthDailyMetricModel } from '../models/health-daily-metric.model.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import { AppleWatchMetric } from '../../modules/health/domain/enums/apple-watch-metric.enum.js';

/** A received value of a metric on a day, in the metric's own unit. */
export interface HealthDailyReading {
  logDate: string;
  metric: AppleWatchMetric;
  value: number;
}

@Injectable()
export class HealthDailyMetricRepository extends AbstractBaseRepository<HealthDailyMetricModel> {
  private readonly logger = new Logger(HealthDailyMetricRepository.name);

  constructor(
    @InjectRepository(HealthDailyMetricModel)
    healthDailyMetricRepository: Repository<HealthDailyMetricModel>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(healthDailyMetricRepository);
  }

  /** Stores the day's values, replacing those received earlier for the same day. */
  async upsertDay(
    userId: string,
    logDate: string,
    values: Map<AppleWatchMetric, number>,
  ): Promise<void> {
    if (values.size === 0) return;
    await this.repository.upsert(
      [...values].map(([metric, value]) => ({
        userId,
        logDate,
        metric,
        value: this.encryptionService.encrypt(String(value)),
      })),
      {
        conflictPaths: ['userId', 'logDate', 'metric'],
        skipUpdateIfNoValuesChanged: false,
      },
    );
  }

  /** Every day received for a metric, oldest first. */
  async findByMetric(
    userId: string,
    metric: AppleWatchMetric,
  ): Promise<HealthDailyReading[]> {
    const models = await this.repository.find({
      where: { userId, metric },
      order: { logDate: 'ASC' },
    });
    return models.flatMap((model) => this.toReading(model));
  }

  /** The most recent value of each metric that has data. */
  async findLatestPerMetric(
    userId: string,
  ): Promise<Map<AppleWatchMetric, HealthDailyReading>> {
    const models = await this.repository
      .createQueryBuilder('reading')
      .distinctOn(['reading.metric'])
      .where('reading.userId = :userId', { userId })
      .orderBy('reading.metric')
      .addOrderBy('reading.logDate', 'DESC')
      .getMany();
    const latest = new Map<AppleWatchMetric, HealthDailyReading>();
    for (const model of models) {
      for (const reading of this.toReading(model)) {
        latest.set(reading.metric, reading);
      }
    }
    return latest;
  }

  private toReading(model: HealthDailyMetricModel): HealthDailyReading[] {
    try {
      const value = Number(this.encryptionService.decrypt(model.value));
      if (!Number.isFinite(value)) return [];
      return [{ logDate: model.logDate, metric: model.metric, value }];
    } catch {
      this.logger.warn(`Could not decrypt a stored ${model.metric} reading`);
      return [];
    }
  }
}
