import { Entity, Column, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { CustomFieldModel } from './custom-field.model.js';
import { DailyLogModel } from './daily-log.model.js';
import { AIInsightModel } from './ai-insight.model.js';
import { ApiKeyModel } from './api-key.model.js';

@Entity('users')
export class UserModel extends BaseModel {
  @Column({ name: 'email_encrypted', type: 'varchar', unique: true })
  emailEncrypted!: string;

  @Column({ name: 'email_index', type: 'varchar', unique: true })
  emailIndex!: string;

  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string;

  @Column({ name: 'ai_insights_enabled', type: 'boolean', default: false })
  aiInsightsEnabled!: boolean;

  @Column({ name: 'ai_context', type: 'text', nullable: true })
  aiContext?: string;

  @Column({ name: 'is_generating_insights', type: 'boolean', default: false })
  isGeneratingInsights!: boolean;

  @Column({ name: 'first_name_encrypted', type: 'varchar', nullable: true })
  firstNameEncrypted?: string | null;

  @Column({
    name: 'health_data_consent_at',
    type: 'timestamptz',
    nullable: true,
  })
  healthDataConsentAt?: Date | null;

  @Column({ name: 'ai_consent_at', type: 'timestamptz', nullable: true })
  aiConsentAt?: Date | null;

  @Column({ name: 'ai_include_notes', type: 'boolean', default: true })
  aiIncludeNotes!: boolean;

  @Column({ name: 'reminder_enabled', type: 'boolean', default: true })
  reminderEnabled!: boolean;

  @Column({
    name: 'reminder_time',
    type: 'varchar',
    length: 5,
    default: '21:00',
  })
  reminderTime!: string;

  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 64,
    default: 'Europe/Paris',
  })
  timezone!: string;

  @Column({ name: 'quick_checkin_field_id', type: 'uuid', nullable: true })
  quickCheckinFieldId?: string | null;

  @Column({ name: 'last_reminder_on', type: 'date', nullable: true })
  lastReminderOn?: string | null;

  @OneToMany(() => CustomFieldModel, (customField) => customField.user)
  customFields?: Relation<CustomFieldModel>[];

  @OneToMany(() => DailyLogModel, (dailyLog) => dailyLog.user)
  dailyLogs?: Relation<DailyLogModel>[];

  @OneToMany(() => AIInsightModel, (aiInsight) => aiInsight.user)
  aiInsights?: Relation<AIInsightModel>[];

  @OneToMany(() => ApiKeyModel, (apiKey) => apiKey.user)
  apiKeys?: Relation<ApiKeyModel>[];
}
