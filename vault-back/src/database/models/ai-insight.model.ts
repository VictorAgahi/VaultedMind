import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { InsightType } from '../../modules/ai-insights/domain/enums/insight-type.enum.js';

@Entity('ai_insights')
export class AIInsightModel extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: InsightType,
    name: 'insight_type',
  })
  type!: InsightType;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @ManyToOne(() => UserModel, (user) => user.aiInsights, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;
}
