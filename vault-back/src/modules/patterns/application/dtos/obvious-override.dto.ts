import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ObviousOverrideDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  findingKey!: string;

  /** True: obvious. False: not obvious. Null: remove the verdict. */
  @IsOptional()
  @IsBoolean()
  obvious?: boolean | null;
}
