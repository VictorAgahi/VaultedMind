import {
  IsDateString,
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsObject,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FIELD_VALUE_SOURCES } from '../../domain/entities/field-value.entity.js';
import type { FieldValueSource } from '../../domain/entities/field-value.entity.js';

export class CreateDailyLogDto {
  @IsDateString()
  logDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}

export class UpdateDailyLogDto {
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}

export const APPEND_NOTES_TEXT_MAX_LENGTH = 20000;

/** Text added at the end of a day's raw notes (a dictation, for instance). */
export class AppendNotesDto {
  @IsDateString()
  logDate!: string;

  @IsString()
  @Matches(/\S/, { message: 'text must not be blank' })
  @MaxLength(APPEND_NOTES_TEXT_MAX_LENGTH)
  text!: string;
}

export class DailyEntryValueDto {
  @IsUUID()
  customFieldId!: string;

  @IsString()
  @MaxLength(1000)
  value!: string;

  @IsOptional()
  @IsObject()
  subValues?: Record<string, string>;

  @IsOptional()
  @IsIn(FIELD_VALUE_SOURCES)
  source?: FieldValueSource;
}

/**
 * A whole day saved in one request: the log, its values, and the values the user cleared.
 */
export class SaveDailyEntryDto {
  @IsOptional()
  @IsUUID()
  logId?: string;

  @IsDateString()
  logDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DailyEntryValueDto)
  values!: DailyEntryValueDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  clearedFieldIds?: string[];
}

import type { SignalView } from '../../../signals/domain/signal-view.js';
import { FieldValueResponseDto } from './field-value.dto.js';

export class DailyLogResponseDto {
  id!: string;
  logDate!: Date;
  notes?: string;
  /** Clean rewrite of the notes, null when absent or out of date with the raw notes. */
  notesClean!: string | null;
  /** Signals extracted from the notes, null when the feature is off or they are not up to date. */
  signals!: SignalView[] | null;
  createdAt!: Date;
  fieldValues?: FieldValueResponseDto[];
}
