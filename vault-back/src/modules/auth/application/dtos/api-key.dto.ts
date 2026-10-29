import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class ApiKeyResponseDto {
  id!: string;
  name!: string;
  createdAt!: Date;
  lastUsedAt?: Date;
}
