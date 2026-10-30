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
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class DailyEntryValueDto {
  @IsUUID()
  customFieldId!: string;

  @IsString()
  @MaxLength(1000)
  value!: string;

  @IsOptional()
  @IsObject()
  subValues?: Record<string, string>;
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

import { FieldValueResponseDto } from './field-value.dto.js';

export class DailyLogResponseDto {
  id!: string;
  logDate!: Date;
  notes?: string;
  createdAt!: Date;
  fieldValues?: FieldValueResponseDto[];
}
