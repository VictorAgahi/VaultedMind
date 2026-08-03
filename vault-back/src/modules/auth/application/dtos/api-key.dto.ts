import { IsString, IsNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class ApiKeyResponseDto {
  id!: string;
  name!: string;
  createdAt!: Date;
  lastUsedAt?: Date;
}
