import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { parseHealthNumber } from '../../domain/services/health-number.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';

export const MAX_SLEEP_SAMPLES = 500;
export const MAX_QUANTITIES = 50;
export const MAX_SLEEP_LINES_LENGTH = 100_000;
const MAX_QUANTITY_VALUE = 10_000_000;

function toNumberOrNull({
  value,
}: {
  value: string | number | null | undefined;
}): string | number | null | undefined {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return null;
  return parseHealthNumber(value) ?? value;
}

export class HealthQuantityDto {
  @IsEnum(AppleWatchMetric)
  metric!: AppleWatchMetric;

  /** A missing reading (empty or null) is skipped instead of failing the whole batch. */
  @IsOptional()
  @Transform(toNumberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_QUANTITY_VALUE)
  value?: number | null;
}

export class SleepSampleDto {
  @IsString()
  @MaxLength(64)
  value!: string;

  @IsISO8601({ strict: true })
  start!: string;

  @IsISO8601({ strict: true })
  end!: string;
}

export class HealthBatchDto {
  /**
   * The user's local day (YYYY-MM-DD) the data belongs to. Optional and lenient:
   * an unreadable value falls back to the user's current day (see resolveSyncDate).
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  date?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_QUANTITIES)
  @ValidateNested({ each: true })
  @Type(() => HealthQuantityDto)
  quantities?: HealthQuantityDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SLEEP_SAMPLES)
  @ValidateNested({ each: true })
  @Type(() => SleepSampleDto)
  sleepSamples?: SleepSampleDto[];

  /** Same samples as text, one "label|start|end" per line: what the Apple shortcut sends. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SLEEP_LINES_LENGTH)
  sleepLines?: string;
}

export interface HealthBatchResult {
  success: true;
  stored: Array<{ metric: AppleWatchMetric; value: number }>;
  createdFields: AppleWatchMetric[];
  /** Metrics now stored in a field the user already had, matched by its name. */
  linkedFields: AppleWatchMetric[];
  /** Metrics for which several existing fields matched: nothing was guessed. */
  ambiguousMetrics: AppleWatchMetric[];
  ignoredSleepLabels: string[];
}
