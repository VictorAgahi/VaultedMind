import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { FieldType } from '../../domain/enums/field-type.enum.js';

export class CreateCustomFieldDto {
  @IsString()
  name!: string;

  @IsEnum(FieldType)
  fieldType!: FieldType;

  @IsOptional()
  @IsString({ each: true })
  optionsOrder?: string[];
}

export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString({ each: true })
  optionsOrder?: string[];
}

export class CustomFieldResponseDto {
  id!: string;
  name!: string;
  fieldType!: FieldType;
  isActive!: boolean;
  optionsOrder?: string[];
  createdAt!: Date;
}
