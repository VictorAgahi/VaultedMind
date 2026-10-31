import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

import type { FieldValueSource } from '../../domain/entities/field-value.entity.js';

export class SaveFieldValueDto {
  @IsUUID()
  customFieldId!: string;

  @IsString()
  @MaxLength(2000)
  value!: string;

  @IsOptional()
  @IsObject()
  subValues?: Record<string, string>;
}

export class UpdateFieldValueDto {
  @IsString()
  @MaxLength(2000)
  value!: string;

  @IsOptional()
  @IsObject()
  subValues?: Record<string, string>;
}

export class FieldValueResponseDto {
  id!: string;
  dailyLogId!: string;
  customFieldId!: string;
  value!: string;
  subValues?: Record<string, string>;
  /** 'agent' for an accepted autofill proposal, null for a manual entry. */
  source!: FieldValueSource | null;
  createdAt!: Date;
}
