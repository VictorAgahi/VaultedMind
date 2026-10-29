import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

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
  createdAt!: Date;
}
