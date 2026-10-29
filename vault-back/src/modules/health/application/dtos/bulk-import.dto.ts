import {
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkRowDto {
  @IsString()
  @MaxLength(50)
  date!: string;

  @IsObject()
  fields!: Record<string, string>;
}

export class BulkImportDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => BulkRowDto)
  rows!: BulkRowDto[];
}

export class BulkImportResponseDto {
  logsCreated!: number;
  fieldsCreated!: number;
  valuesCreated!: number;
}
