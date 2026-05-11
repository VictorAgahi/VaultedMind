import { IsString, IsObject, IsOptional, IsNumber } from 'class-validator';

export class SubscribeDto {
  @IsString()
  endpoint!: string;

  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @IsObject()
  keys!: {
    p256dh: string;
    auth: string;
  };
}
