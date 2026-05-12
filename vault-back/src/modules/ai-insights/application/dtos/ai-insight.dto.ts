import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

export class CreateAIInsightDto {
  @IsEnum(InsightType)
  type!: InsightType;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AIInsightResponseDto {
  id!: string;
  type!: InsightType;
  title!: string;
  content!: string;
  metadata?: Record<string, unknown>;
  createdAt!: Date;
}
