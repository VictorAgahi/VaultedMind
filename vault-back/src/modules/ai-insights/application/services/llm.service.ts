import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'max';

export interface LLMRequestConfig {
  model?: string;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  proMode?: boolean;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly client: OpenAI;

  // ── Per-agent model slots ─────────────────────────────────────────────────
  private readonly defaultModel: string;
  private readonly analysisModel: string;
  private readonly correlationModel: string;
  private readonly contextModel: string;
  private readonly predictionModel: string;
  private readonly qualityModel: string;
  private readonly synthesisModel: string;

  // ── Global defaults ───────────────────────────────────────────────────────
  private readonly defaultReasoningEffort: ReasoningEffort;
  private readonly defaultProMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');

    const defaultFallback = 'gpt-5.6-sol';
    this.defaultModel =
      this.configService.get<string>('OPENAI_MODEL')?.trim() || defaultFallback;
    this.analysisModel =
      this.configService.get<string>('OPENAI_ANALYSIS_MODEL')?.trim() ||
      defaultFallback;
    this.correlationModel =
      this.configService.get<string>('OPENAI_CORRELATION_MODEL')?.trim() ||
      defaultFallback;
    this.contextModel =
      this.configService.get<string>('OPENAI_CONTEXT_MODEL')?.trim() ||
      defaultFallback;
    this.predictionModel =
      this.configService.get<string>('OPENAI_PREDICTION_MODEL')?.trim() ||
      defaultFallback;
    this.qualityModel =
      this.configService.get<string>('OPENAI_QUALITY_MODEL')?.trim() ||
      defaultFallback;
    this.synthesisModel =
      this.configService.get<string>('OPENAI_SYNTHESIS_MODEL')?.trim() ||
      defaultFallback;

    const effortRaw = this.configService
      .get<string>('OPENAI_REASONING_EFFORT')
      ?.trim()
      ?.toLowerCase();
    this.defaultReasoningEffort = this.parseReasoningEffort(effortRaw) ?? 'max';

    this.defaultProMode =
      this.configService.get<string>('OPENAI_PRO_MODE')?.trim() === 'true';

    this.client = new OpenAI({ apiKey });

    this.logger.log(
      `LLMService initialized — default: ${this.defaultModel}, ` +
        `reasoning: ${this.defaultReasoningEffort}, pro: ${this.defaultProMode}`,
    );
  }

  // ── Model getters ─────────────────────────────────────────────────────────

  getAnalysisModel(): string {
    return this.analysisModel;
  }

  getCorrelationModel(): string {
    return this.correlationModel;
  }

  getContextModel(): string {
    return this.contextModel;
  }

  getPredictionModel(): string {
    return this.predictionModel;
  }

  getQualityModel(): string {
    return this.qualityModel;
  }

  getSynthesisModel(): string {
    return this.synthesisModel;
  }

  // ── Core generation methods ───────────────────────────────────────────────

  /**
   * Simple generation method — backward compatible.
   * Delegates to `generateTextWithConfig` with default settings.
   */
  async generateText(
    prompt: string,
    maxTokens: number = 3000,
    model?: string,
  ): Promise<string> {
    return this.generateTextWithConfig(prompt, {
      model,
      maxTokens,
    });
  }

  /**
   * Advanced generation with full control over reasoning effort, pro mode,
   * and token budget. Used by the multi-agent pipeline.
   */
  async generateTextWithConfig(
    prompt: string,
    config: LLMRequestConfig = {},
  ): Promise<string> {
    const targetModel = config.model ?? this.defaultModel;
    const reasoningEffort =
      config.reasoningEffort ?? this.defaultReasoningEffort;
    const proMode = config.proMode ?? this.defaultProMode;
    const maxTokens = config.maxTokens ?? 3000;

    try {
      this.logger.debug(
        `[LLM] model=${targetModel} reasoning=${reasoningEffort} ` +
          `pro=${proMode} maxTokens=${maxTokens}`,
      );

      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: proMode ? `${targetModel}` : targetModel,
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
        targetModel.startsWith('o3') ||
        targetModel.startsWith('o4')
      ) {
        // GPT-5.x / o-series: use max_completion_tokens
        body.max_completion_tokens = Math.max(maxTokens, 100000);

        if (targetModel.includes('gpt-5.6')) {
          // GPT-5.6 specific reasoning API
          Object.assign(body, {
            reasoning: {
              effort: reasoningEffort,
              ...(proMode ? { mode: 'pro' } : {}),
            },
          });
        } else if (targetModel.startsWith('o')) {
          // Legacy/current o-series reasoning effort
          body.reasoning_effort =
            reasoningEffort === 'max' ? 'high' : reasoningEffort;
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
      this.logger.error(
        `[LLM] Error — model=${targetModel} reasoning=${reasoningEffort}:`,
        error,
      );
      throw error;
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private parseReasoningEffort(
    raw: string | undefined,
  ): ReasoningEffort | undefined {
    const valid: ReasoningEffort[] = ['low', 'medium', 'high', 'max'];
    if (raw && valid.includes(raw as ReasoningEffort)) {
      return raw as ReasoningEffort;
    }
    return undefined;
  }
}
