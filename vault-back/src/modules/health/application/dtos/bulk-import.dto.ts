import { IsString, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkRowDto {
  @IsString()
  date!: string;

  @IsObject()
  fields!: Record<string, string>;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRowDto)
  rows!: BulkRowDto[];
}

export class BulkImportResponseDto {
  logsCreated!: number;
  fieldsCreated!: number;
  valuesCreated!: number;
}
