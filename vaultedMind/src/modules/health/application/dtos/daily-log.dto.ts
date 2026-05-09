import { IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateDailyLogDto {
  @IsDateString()
  logDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDailyLogDto {
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

import { FieldValueResponseDto } from './field-value.dto.js';

export class DailyLogResponseDto {
  id!: string;
  logDate!: Date;
  notes?: string;
  createdAt!: Date;
  fieldValues?: FieldValueResponseDto[];
}
