import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly analysisModel: string;
  private readonly synthesisModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');

    const defaultFallback = 'gpt-4o';
    this.defaultModel =
      this.configService.get<string>('OPENAI_MODEL')?.trim() || defaultFallback;
    this.analysisModel =
      this.configService.get<string>('OPENAI_ANALYSIS_MODEL')?.trim() ||
      defaultFallback;
    this.synthesisModel =
      this.configService.get<string>('OPENAI_SYNTHESIS_MODEL')?.trim() ||
      defaultFallback;

    this.client = new OpenAI({ apiKey });
  }

  getAnalysisModel(): string {
    return this.analysisModel;
  }

  getSynthesisModel(): string {
    return this.synthesisModel;
  }

  async generateText(
    prompt: string,
    maxTokens: number = 3000,
    model?: string,
  ): Promise<string> {
    const targetModel = model ?? this.defaultModel;
    try {
      this.logger.debug(`Calling OpenAI API with model: ${targetModel}...`);

      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      if (
        targetModel.includes('gpt-5') ||
        targetModel.startsWith('o1') ||
        targetModel.startsWith('o3')
      ) {
        body.max_completion_tokens = maxTokens;

        if (targetModel.includes('pro')) {
          body.reasoning_effort = 'high';
        }
      } else {
        body.max_tokens = maxTokens;
      }

      const completion = await this.client.chat.completions.create(body);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      this.logger.error(`OpenAI API error with model ${targetModel}:`, error);
      throw error;
    }
  }
}
