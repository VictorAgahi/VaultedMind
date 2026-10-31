import { Injectable } from '@nestjs/common';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { HealthDailyMetricRepository } from '../../../../database/repositories/health-daily-metric.repository.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import type { CustomField } from '../../domain/entities/custom-field.entity.js';
import {
  convertHealthValue,
  type HealthFieldUnit,
} from '../../domain/services/health-metric-units.js';
import { HealthSyncService } from './health-sync.service.js';

export interface FieldLinkResult {
  field: CustomField;
  /** Past days filled from the stored health data. */
  filledDays: number;
}

/** Links a metric to a field and fills the field's past days from the stored health data. */
@Injectable()
export class HealthFieldLinkerService {
  constructor(
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly dailyMetricRepository: HealthDailyMetricRepository,
    private readonly healthSyncService: HealthSyncService,
  ) {}

  async link(
    userId: string,
    fieldId: string,
    metric: AppleWatchMetric,
    unit: HealthFieldUnit | null,
  ): Promise<FieldLinkResult> {
    await this.customFieldRepository.clearAppleWatchMetric(
      userId,
      metric,
      fieldId,
    );
    const field = await this.customFieldRepository.updateDomain(fieldId, {
      appleWatchMetric: metric,
      appleWatchUnit: unit,
    });
    const filledDays = await this.backfill(userId, fieldId, metric, unit);
    return { field, filledDays };
  }

  /** Never overwrites a value the user entered: see canFillFromHealth. */
  async backfill(
    userId: string,
    fieldId: string,
    metric: AppleWatchMetric,
    unit: HealthFieldUnit | null,
  ): Promise<number> {
    const readings = await this.dailyMetricRepository.findByMetric(
      userId,
      metric,
    );
    let filledDays = 0;
    for (const reading of readings) {
      const dailyLog = await this.healthSyncService.findOrCreateDailyLog(
        userId,
        new Date(`${reading.logDate}T00:00:00Z`),
      );
      const written = await this.healthSyncService.storeHealthValue(
        dailyLog.id,
        fieldId,
        String(convertHealthValue(metric, reading.value, unit)),
        true,
      );
      if (written) filledDays++;
    }
    return filledDays;
  }
}
