import { Entity, Column, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { CustomFieldModel } from './custom-field.model.js';
import { DailyLogModel } from './daily-log.model.js';

@Entity('users')
export class UserModel extends BaseModel {
  @Column({ name: 'email_encrypted', type: 'varchar', unique: true })
  emailEncrypted!: string;

  @Column({ name: 'email_index', type: 'varchar', unique: true })
  emailIndex!: string;

  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string;

  @OneToMany(() => CustomFieldModel, (customField) => customField.user)
  customFields?: Relation<CustomFieldModel>[];

  @OneToMany(() => DailyLogModel, (dailyLog) => dailyLog.user)
  dailyLogs?: Relation<DailyLogModel>[];
}
