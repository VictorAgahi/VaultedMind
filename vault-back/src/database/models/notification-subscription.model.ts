import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';

@Entity('notification_subscriptions')
export class NotificationSubscriptionModel extends BaseModel {
  @Column({ name: 'endpoint', type: 'varchar' })
  endpoint!: string;

  @Column({ name: 'expiration_time', type: 'bigint', nullable: true })
  expirationTime?: number;

  @Column({ name: 'keys', type: 'jsonb' })
  keys!: {
    p256dh: string;
    auth: string;
  };

  @ManyToOne(() => UserModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserModel>;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
}
