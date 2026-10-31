import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  IsIn,
  Min,
} from 'class-validator';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import type {
  SubFieldDefinition,
  GoalDirection,
  AutofillMode,
} from '../../domain/entities/custom-field.entity.js';
import { AUTOFILL_MODES } from '../../domain/entities/custom-field.entity.js';
import {
  HEALTH_FIELD_UNITS,
  type HealthFieldUnit,
} from '../../domain/services/health-metric-units.js';

import { CONSTRUCTS } from '../../../signals/domain/constructs.js';

const GOAL_DIRECTIONS: GoalDirection[] = ['AT_LEAST', 'AT_MOST'];

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  goalTarget?: number | null;

  @IsOptional()
  @IsIn(GOAL_DIRECTIONS)
  goalDirection?: GoalDirection | null;

  @IsOptional()
  @IsIn(CONSTRUCTS)
  constructOverride?: string | null;

  @IsOptional()
  @IsIn(AUTOFILL_MODES)
  autofillMode?: AutofillMode;
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
  appleWatchMetric?: AppleWatchMetric | null;

  /** Omitted with a metric, the unit is inferred from the field. */
  @IsOptional()
  @IsIn(HEALTH_FIELD_UNITS)
  appleWatchUnit?: HealthFieldUnit | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  goalTarget?: number | null;

  @IsOptional()
  @IsIn(GOAL_DIRECTIONS)
  goalDirection?: GoalDirection | null;

  @IsOptional()
  @IsIn(CONSTRUCTS)
  constructOverride?: string | null;

  @IsOptional()
  @IsIn(AUTOFILL_MODES)
  autofillMode?: AutofillMode;
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
  appleWatchUnit?: HealthFieldUnit;
  goalTarget?: number;
  goalDirection?: GoalDirection;
  construct?: string;
  constructOverride?: string;
  autofillMode!: AutofillMode;
  createdAt!: Date;
}
