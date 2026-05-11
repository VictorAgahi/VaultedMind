import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { DailyLogModel } from './daily-log.model.js';
import { CustomFieldModel } from './custom-field.model.js';

@Entity('field_values')
@Unique(['dailyLogId', 'customFieldId'])
export class FieldValueModel extends BaseModel {
  @Column({ type: 'text' })
  value!: string;

  @Column({ name: 'daily_log_id', type: 'uuid' })
  dailyLogId!: string;

  @ManyToOne(() => DailyLogModel, (dailyLog) => dailyLog.fieldValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'daily_log_id' })
  dailyLog!: Relation<DailyLogModel>;

  @Column({ name: 'custom_field_id', type: 'uuid' })
  customFieldId!: string;

  @ManyToOne(() => CustomFieldModel, (customField) => customField.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'custom_field_id' })
  customField!: Relation<CustomFieldModel>;
}
