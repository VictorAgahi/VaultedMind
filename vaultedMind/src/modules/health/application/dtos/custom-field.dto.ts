import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { FieldType } from '../../domain/enums/field-type.enum.js';

export class CreateCustomFieldDto {
  @IsString()
  name!: string;

  @IsEnum(FieldType)
  fieldType!: FieldType;
}

export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CustomFieldResponseDto {
  id!: string;
  name!: string;
  fieldType!: FieldType;
  isActive!: boolean;
  createdAt!: Date;
}
