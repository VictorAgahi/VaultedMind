import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'max';

export interface LLMRequestConfig {
  model?: string;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  proMode?: boolean;
}

export interface StructuredOutputConfig extends LLMRequestConfig {
  /** Name of the JSON schema (letters, digits, underscores). */
  schemaName: string;
  /** Strict JSON schema the reply must follow. */
  schema: object;
}

export interface AudioTranscriptionInput {
  audio: Buffer;
  /** File name with an extension the provider recognizes (m4a, webm, mp3, wav). */
  fileName: string;
  mimeType: string;
  language: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly client: OpenAI;

  // ── Per-agent model slots ─────────────────────────────────────────────────
  private readonly defaultModel: string;
  private readonly miniModel: string;
  private readonly chatModel: string;
  private readonly analysisModel: string;
  private readonly correlationModel: string;
  private readonly contextModel: string;
  private readonly predictionModel: string;
  private readonly qualityModel: string;
  private readonly synthesisModel: string;
  private readonly transcribeModel: string;

  // ── Global defaults ───────────────────────────────────────────────────────
  private readonly defaultReasoningEffort: ReasoningEffort;
  private readonly defaultProMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');

    const miniFallback = 'gpt-4o-mini';
    const flagshipFallback = 'gpt-5.5';

    this.miniModel =
      this.configService.get<string>('OPENAI_MINI_MODEL')?.trim() ||
      miniFallback;
    this.chatModel =
      this.configService.get<string>('OPENAI_CHAT_MODEL')?.trim() ||
      this.miniModel;
    this.defaultModel =
      this.configService.get<string>('OPENAI_MODEL')?.trim() || this.miniModel;
    this.analysisModel =
      this.configService.get<string>('OPENAI_ANALYSIS_MODEL')?.trim() ||
      this.miniModel;
    this.correlationModel =
      this.configService.get<string>('OPENAI_CORRELATION_MODEL')?.trim() ||
      this.miniModel;
    this.contextModel =
      this.configService.get<string>('OPENAI_CONTEXT_MODEL')?.trim() ||
      this.miniModel;
    this.predictionModel =
      this.configService.get<string>('OPENAI_PREDICTION_MODEL')?.trim() ||
      this.miniModel;
    this.qualityModel =
      this.configService.get<string>('OPENAI_QUALITY_MODEL')?.trim() ||
      this.miniModel;
    this.synthesisModel =
      this.configService.get<string>('OPENAI_SYNTHESIS_MODEL')?.trim() ||
      flagshipFallback;
    this.transcribeModel =
      this.configService.get<string>('OPENAI_TRANSCRIBE_MODEL')?.trim() ||
      'gpt-4o-mini-transcribe';

    const effortRaw = this.configService
      .get<string>('OPENAI_REASONING_EFFORT')
      ?.trim()
      ?.toLowerCase();
    this.defaultReasoningEffort = this.parseReasoningEffort(effortRaw) ?? 'low';

    this.defaultProMode =
      this.configService.get<string>('OPENAI_PRO_MODE')?.trim() === 'true';

    this.client = new OpenAI({ apiKey });

    this.logger.log(
      `LLMService initialized — mini: ${this.miniModel}, synthesis: ${this.synthesisModel}, ` +
        `reasoning: ${this.defaultReasoningEffort}, pro: ${this.defaultProMode}`,
    );
  }

  // ── Model getters ─────────────────────────────────────────────────────────

  getMiniModel(): string {
    return this.miniModel;
  }

  getChatModel(): string {
    return this.chatModel;
  }

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

  getTranscribeModel(): string {
    return this.transcribeModel;
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

      this.applyTokenParameters(body, targetModel, maxTokens, reasoningEffort);

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

  /**
   * Generation constrained by a strict JSON schema (structured outputs).
   * Returns the raw JSON string; the caller parses and verifies it.
   */
  async generateStructured(
    prompt: string,
    config: StructuredOutputConfig,
  ): Promise<string> {
    const targetModel = config.model ?? this.defaultModel;
    const reasoningEffort =
      config.reasoningEffort ?? this.defaultReasoningEffort;
    const maxTokens = config.maxTokens ?? 3000;

    try {
      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: targetModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: config.schemaName,
            strict: true,
            schema: config.schema as Record<string, unknown>,
          },
        },
      };
      this.applyTokenParameters(body, targetModel, maxTokens, reasoningEffort);

      const completion = await this.client.chat.completions.create(body);
      if (completion.choices[0]?.message?.refusal) {
        throw new Error('The model refused the structured request');
      }
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      return content;
    } catch (error) {
      this.logger.error(
        `[LLM] Structured error — model=${targetModel}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Speech to text. The audio stays in memory and is never logged or stored here.
   */
  async transcribeAudio(input: AudioTranscriptionInput): Promise<string> {
    try {
      const file = await toFile(input.audio, input.fileName, {
        type: input.mimeType,
      });
      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: this.transcribeModel,
        language: input.language,
      });
      return transcription.text;
    } catch (error) {
      this.logger.error(
        `[LLM] Transcription error — model=${this.transcribeModel}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private applyTokenParameters(
    body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    targetModel: string,
    maxTokens: number,
    reasoningEffort: ReasoningEffort,
  ): void {
    if (
      targetModel.includes('gpt-5') ||
      targetModel.startsWith('o1') ||
      targetModel.startsWith('o3') ||
      targetModel.startsWith('o4')
    ) {
      // GPT-5.x / o-series: use max_completion_tokens
      body.max_completion_tokens = maxTokens;

      if (targetModel.includes('gpt-5.6') || targetModel.startsWith('o')) {
        body.reasoning_effort =
          reasoningEffort === 'max' ? 'high' : reasoningEffort;
      }
    } else {
      body.max_tokens = maxTokens;
    }
  }

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
