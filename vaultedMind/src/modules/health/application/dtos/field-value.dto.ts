import { IsString, IsUUID } from 'class-validator';

export class SaveFieldValueDto {
  @IsUUID()
  customFieldId!: string;

  @IsString()
  value!: string;
}

export class UpdateFieldValueDto {
  @IsString()
  value!: string;
}

export class FieldValueResponseDto {
  id!: string;
  dailyLogId!: string;
  customFieldId!: string;
  value!: string;
  createdAt!: Date;
}
