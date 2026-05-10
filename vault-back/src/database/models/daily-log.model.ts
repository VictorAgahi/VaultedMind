import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { FieldValueModel } from './field-value.model.js';

@Entity('daily_logs')
export class DailyLogModel extends BaseModel {
  @Column({ name: 'log_date', type: 'date' })
  logDate!: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserModel, (user) => user.dailyLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;

  @OneToMany(() => FieldValueModel, (fieldValue) => fieldValue.dailyLog)
  fieldValues?: Relation<FieldValueModel>[];
}
