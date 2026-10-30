import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';

@Entity('pattern_reports')
export class PatternReportModel extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'engine_version', type: 'varchar' })
  engineVersion!: string;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;

  /** Encrypted JSON of the whole report. */
  @Column({ type: 'text' })
  payload!: string;

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;
}
