import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  JevAnswer,
  JevQuestions,
  JevResponse,
} from '../../domain/jev-types.js';

export const JEV_MODEL = 'jev-1.14.0';
const JEV_TIMEOUT_MS = 30_000;
const JEV_MAX_ATTEMPTS = 3;
const JEV_RETRY_BASE_DELAY_MS = 1000;

export class JevApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'JevApiError';
  }
}

interface RawJevAnswer {
  type?: string;
  noul?: number;
  score?: number;
  confidence?: number;
}

interface RawJevResponse {
  model?: string;
  answers?: Record<string, RawJevAnswer>;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 529 || status >= 500;
}

/**
 * Minimal client for the Jev "System One" endpoint (typed answers to typed questions).
 */
@Injectable()
export class JevClient {
  private readonly logger = new Logger(JevClient.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.baseUrl());
  }

  async analyze(state: string, questions: JevQuestions): Promise<JevResponse> {
    const apiKey = this.apiKey();
    const baseUrl = this.baseUrl();
    if (!apiKey || !baseUrl) {
      throw new JevApiError('Jev is not configured', null);
    }

    let lastError = new JevApiError('Jev request failed', null);
    for (let attempt = 1; attempt <= JEV_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.send(baseUrl, apiKey, state, questions);
      } catch (error) {
        lastError =
          error instanceof JevApiError
            ? error
            : new JevApiError('Jev network error', null);
        const retryable =
          lastError.status === null || isRetryableStatus(lastError.status);
        if (!retryable || attempt === JEV_MAX_ATTEMPTS) break;
        this.logger.warn(
          `Jev attempt ${attempt} failed (${lastError.status ?? 'network'}), retrying`,
        );
        await this.delay(JEV_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
    throw lastError;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async send(
    baseUrl: string,
    apiKey: string,
    state: string,
    questions: JevQuestions,
  ): Promise<JevResponse> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/systemone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: JEV_MODEL, state, questions }),
        signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
      });
    } catch {
      throw new JevApiError('Jev network error or timeout', null);
    }

    if (!response.ok) {
      throw new JevApiError(
        `Jev responded with ${response.status}`,
        response.status,
      );
    }
    let body: RawJevResponse;
    try {
      body = (await response.json()) as RawJevResponse;
    } catch {
      throw new JevApiError('Jev returned invalid JSON', response.status);
    }
    return this.parse(body);
  }

  private parse(body: RawJevResponse): JevResponse {
    const answers: Record<string, JevAnswer> = {};
    for (const [key, raw] of Object.entries(body.answers ?? {})) {
      if (raw.type === 'noul' && typeof raw.noul === 'number') {
        answers[key] = { type: 'noul', noul: raw.noul };
      } else if (raw.type === 'score' && typeof raw.score === 'number') {
        answers[key] = {
          type: 'score',
          score: raw.score,
          confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
        };
      }
    }
    return { model: body.model ?? JEV_MODEL, answers };
  }

  private apiKey(): string | undefined {
    return this.configService.get<string>('JEV_API_KEY')?.trim() || undefined;
  }

  private baseUrl(): string | undefined {
    return (
      this.configService
        .get<string>('JEV_API_BASE')
        ?.trim()
        .replace(/\/+$/, '') || undefined
    );
  }
}
