import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateBy,
  ValidateNested,
  ValidationOptions,
} from 'class-validator';
import {
  CUSTOM_SIGNAL_ID_PATTERN,
  CUSTOM_SIGNAL_KINDS,
  CUSTOM_SIGNAL_LIMITS,
  type CustomSignalKind,
} from '../../../signals/domain/custom-signal.js';
import {
  TRACKED_SUBJECT_KINDS,
  TRACKED_SUBJECT_LIMITS,
  type TrackedSubjectKind,
} from '../../../signals/domain/tracked-subject.js';
import {
  PERSON_ID_PATTERN,
  PERSON_LIMITS,
} from '../../../signals/domain/person.js';
import {
  MAX_INSIGHT_TARGETS,
  MAX_TARGET_VALUE_LENGTH,
  TARGET_DIRECTIONS,
  type TargetDirection,
} from '../../../patterns/domain/insight-target.js';

function IsIanaTimeZone(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIanaTimeZone',
      validator: {
        validate: (value: string): boolean => {
          if (typeof value !== 'string' || value.length === 0) return false;
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage: (): string => 'Fuseau horaire invalide',
      },
    },
    options,
  );
}

export class PersonDto {
  @Matches(PERSON_ID_PATTERN, { message: 'Identifiant de personne invalide' })
  id!: string;

  @IsString()
  @Length(1, PERSON_LIMITS.aliasMaxLength)
  alias!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PERSON_LIMITS.maxVariants)
  @IsString({ each: true })
  @Length(1, PERSON_LIMITS.variantMaxLength, { each: true })
  variants!: string[];
}

export class TrackedSubjectDto {
  @IsIn(TRACKED_SUBJECT_KINDS)
  kind!: TrackedSubjectKind;

  @IsOptional()
  @IsString()
  @Length(1, TRACKED_SUBJECT_LIMITS.nameMaxLength)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, TRACKED_SUBJECT_LIMITS.speciesMaxLength)
  species?: string;
}

export class CustomSignalDto {
  @Matches(CUSTOM_SIGNAL_ID_PATTERN, {
    message: 'Identifiant de signal invalide',
  })
  id!: string;

  @IsString()
  @Length(
    CUSTOM_SIGNAL_LIMITS.labelMinLength,
    CUSTOM_SIGNAL_LIMITS.labelMaxLength,
  )
  label!: string;

  @IsString()
  @Length(
    CUSTOM_SIGNAL_LIMITS.questionMinLength,
    CUSTOM_SIGNAL_LIMITS.questionMaxLength,
  )
  question!: string;

  @IsIn(CUSTOM_SIGNAL_KINDS)
  kind!: CustomSignalKind;
}

export class InsightTargetDto {
  @IsUUID()
  fieldId!: string;

  @IsIn(TARGET_DIRECTIONS)
  direction!: TargetDirection;

  // Text fields only: the target is then "the field equals this value"
  @IsOptional()
  @IsString()
  @Length(1, MAX_TARGET_VALUE_LENGTH)
  value?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string | null;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  // Quarter-hour slots: the reminder job runs every 15 minutes
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):(00|15|30|45)$/, {
    message: "L'heure du rappel doit être au format HH:MM, par quart d'heure",
  })
  reminderTime?: string;

  @IsOptional()
  @IsIanaTimeZone()
  timezone?: string;

  @IsOptional()
  @IsUUID()
  quickCheckinFieldId?: string | null;

  @IsOptional()
  @IsBoolean()
  aiIncludeNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  insightsV2Enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PERSON_LIMITS.maxPeople)
  @ValidateNested({ each: true })
  @Type(() => PersonDto)
  people?: PersonDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TrackedSubjectDto)
  trackedSubject?: TrackedSubjectDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CUSTOM_SIGNAL_LIMITS.maxSignals)
  @ValidateNested({ each: true })
  @Type(() => CustomSignalDto)
  customSignals?: CustomSignalDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INSIGHT_TARGETS)
  @ValidateNested({ each: true })
  @Type(() => InsightTargetDto)
  insightTargets?: InsightTargetDto[];
}
