import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseModel } from './base.model.js';
import { UserModel } from './user.model.js';
import { FieldValueModel } from './field-value.model.js';
import { FieldType } from '../../modules/health/domain/enums/field-type.enum.js';

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
  
  @Column({ name: 'options_order', type: 'json', nullable: true })
  optionsOrder?: string[];

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
