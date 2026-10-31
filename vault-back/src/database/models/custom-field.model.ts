import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type {
  AutofillMode,
  GoalDirection,
} from '../../modules/health/domain/entities/custom-field.entity.js';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { FieldValueModel } from './field-value.model.js';
import { FieldType } from '../../modules/health/domain/enums/field-type.enum.js';
import { AppleWatchMetric } from '../../modules/health/domain/enums/apple-watch-metric.enum.js';
import type { SubFieldDefinition } from '../../modules/health/domain/entities/custom-field.entity.js';
import type { HealthFieldUnit } from '../../modules/health/domain/services/health-metric-units.js';

@Entity('custom_fields')
export class CustomFieldModel extends BaseModel {
  @Column({ type: 'varchar' })
  name!: string;

  @Column({
    type: 'enum',
    enum: FieldType,
    name: 'field_type',
    default: FieldType.STRING,
  })
  fieldType!: FieldType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true })
  category?: string;

  @Column({ name: 'remember_last_value', type: 'boolean', default: false })
  rememberLastValue!: boolean;

  @Column({ type: 'float', nullable: true })
  min?: number;

  @Column({ type: 'float', nullable: true })
  max?: number;

  @Column({ name: 'options_order', type: 'json', nullable: true })
  optionsOrder?: string[];

  @Column({ name: 'sub_fields', type: 'json', nullable: true })
  subFields?: SubFieldDefinition[];

  @Column({
    type: 'enum',
    enum: AppleWatchMetric,
    name: 'apple_watch_metric',
    nullable: true,
  })
  appleWatchMetric?: AppleWatchMetric | null;

  /** Unit the field stores a duration metric in; null keeps the metric's own unit. */
  @Column({
    name: 'apple_watch_unit',
    type: 'varchar',
    length: 8,
    nullable: true,
  })
  appleWatchUnit?: HealthFieldUnit | null;

  @Column({ name: 'goal_target', type: 'double precision', nullable: true })
  goalTarget?: number | null;

  @Column({
    name: 'goal_direction',
    type: 'varchar',
    length: 8,
    nullable: true,
  })
  goalDirection?: GoalDirection | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  construct?: string | null;

  @Column({
    name: 'construct_name_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  constructNameHash?: string | null;

  @Column({
    name: 'construct_override',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  constructOverride?: string | null;

  @Column({
    name: 'autofill_mode',
    type: 'varchar',
    length: 8,
    default: 'AUTO',
  })
  autofillMode!: AutofillMode;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserModel, (user) => user.customFields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;

  @OneToMany(() => FieldValueModel, (fieldValue) => fieldValue.customField)
  values?: Relation<FieldValueModel>[];
}
