import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';

export class AppleHealthSyncDto {
  @IsEnum(AppleWatchMetric)
  metric!: AppleWatchMetric;

  @IsNotEmpty()
  value!: string | number;

  @IsString()
  @IsNotEmpty()
  date!: string;
}
