import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';

@Entity('ai_chat_usages')
export class AIChatUsageModel extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'kind', type: 'varchar', length: 32, default: 'chat' })
  kind!: string;

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;
}
