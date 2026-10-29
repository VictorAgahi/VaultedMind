import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  ValidateNested,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';
import { isAllowedPushEndpoint } from '../utils/push-endpoint.util.js';

function IsAllowedPushEndpoint(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isAllowedPushEndpoint',
      validator: {
        validate: (value: unknown) => isAllowedPushEndpoint(value),
        defaultMessage: () =>
          'endpoint must be an https URL of a known Web Push service',
      },
    },
    options,
  );
}

export class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  auth!: string;
}

export class SubscribeDto {
  @IsString()
  @IsAllowedPushEndpoint()
  endpoint!: string;

  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}
