import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
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

export const AI_CONTEXT_MAX_LENGTH = 4000;
export const AI_CHAT_MESSAGE_MAX_LENGTH = 2000;

export class AIContextDto {
  @IsString()
  @MaxLength(AI_CONTEXT_MAX_LENGTH)
  context!: string;
}

export class AIChatMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(AI_CHAT_MESSAGE_MAX_LENGTH)
  message?: string;
}
