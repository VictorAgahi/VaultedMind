import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import type { SubFieldDefinition } from '../../domain/entities/custom-field.entity.js';

export class CreateCustomFieldDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(FieldType)
  fieldType!: FieldType;

  @IsOptional()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(100)
  optionsOrder?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  subFields?: SubFieldDefinition[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsBoolean()
  rememberLastValue?: boolean;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsEnum(AppleWatchMetric)
  appleWatchMetric?: AppleWatchMetric;
}

export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(100)
  optionsOrder?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  subFields?: SubFieldDefinition[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsBoolean()
  rememberLastValue?: boolean;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsEnum(AppleWatchMetric)
  appleWatchMetric?: AppleWatchMetric;
}

export class CustomFieldResponseDto {
  id!: string;
  name!: string;
  fieldType!: FieldType;
  isActive!: boolean;
  optionsOrder?: string[];
  subFields?: SubFieldDefinition[];
  category?: string;
  rememberLastValue!: boolean;
  min?: number;
  max?: number;
  appleWatchMetric?: AppleWatchMetric;
  createdAt!: Date;
}
