import { Entity, Column, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { CustomFieldModel } from './custom-field.model.js';
import { DailyLogModel } from './daily-log.model.js';
import { AIInsightModel } from './ai-insight.model.js';

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

  @OneToMany(() => CustomFieldModel, (customField) => customField.user)
  customFields?: Relation<CustomFieldModel>[];

  @OneToMany(() => DailyLogModel, (dailyLog) => dailyLog.user)
  dailyLogs?: Relation<DailyLogModel>[];

  @OneToMany(() => AIInsightModel, (aiInsight) => aiInsight.user)
  aiInsights?: Relation<AIInsightModel>[];
}
