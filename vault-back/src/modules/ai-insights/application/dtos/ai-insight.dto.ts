import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

export const AI_CHAT_HISTORY_MAX_TURNS = 6;

export type ChatRole = 'user' | 'assistant';

export class AIChatTurnDto {
  @IsIn(['user', 'assistant'])
  role!: ChatRole;

  @IsString()
  @MaxLength(AI_CHAT_MESSAGE_MAX_LENGTH)
  content!: string;
}

export class AIChatMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(AI_CHAT_MESSAGE_MAX_LENGTH)
  message?: string;

  // Last exchanges, so follow-up questions keep their context
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(AI_CHAT_HISTORY_MAX_TURNS)
  @ValidateNested({ each: true })
  @Type(() => AIChatTurnDto)
  history?: AIChatTurnDto[];
}

export class EnableAIInsightsDto {
  @IsOptional()
  @IsBoolean()
  consent?: boolean;

  @IsOptional()
  @IsBoolean()
  includeNotes?: boolean;
}
