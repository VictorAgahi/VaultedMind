import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { DailyLogModel } from './daily-log.model.js';

@Entity('note_signals')
export class NoteSignalsModel extends BaseModel {
  @Column({ name: 'daily_log_id', type: 'uuid', unique: true })
  dailyLogId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'bank_version', type: 'varchar' })
  bankVersion!: string;

  @Column({ name: 'source_hash', type: 'varchar' })
  sourceHash!: string;

  /** Encrypted JSON of the signal payload; null when only failures are recorded. */
  @Column({ type: 'text', nullable: true })
  payload!: string | null;

  /** Encrypted JSON of the user overrides per signal key. */
  @Column({ type: 'text', nullable: true })
  corrections!: string | null;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount!: number;

  @Column({ name: 'last_failure_at', type: 'timestamptz', nullable: true })
  lastFailureAt!: Date | null;

  @ManyToOne(() => DailyLogModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'daily_log_id' })
  dailyLog!: Relation<DailyLogModel>;

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;
}
