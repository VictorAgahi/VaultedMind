import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { AppleWatchMetric } from '../../modules/health/domain/enums/apple-watch-metric.enum.js';

/** Every Apple Health value received for a day, kept whether or not a field receives it. */
@Entity('health_daily_metrics')
@Unique('UQ_health_daily_metrics_user_date_metric', [
  'userId',
  'logDate',
  'metric',
])
export class HealthDailyMetricModel extends BaseModel {
  @Column({ name: 'log_date', type: 'date' })
  logDate!: string;

  @Column({ type: 'enum', enum: AppleWatchMetric })
  metric!: AppleWatchMetric;

  /** The metric's own value (unit of the catalog), encrypted at rest. */
  @Column({ type: 'text' })
  value!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;
}
