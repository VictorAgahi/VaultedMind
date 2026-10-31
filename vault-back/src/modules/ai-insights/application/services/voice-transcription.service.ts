import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AIChatUsageRepository } from '../../../../database/repositories/ai-chat-usage.repository.js';
import { LLMService } from './llm.service.js';
import { assertNotesConsent, reserveDailyUsage } from './ai-assist-guards.js';

export const VOICE_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_LANGUAGE = 'fr';

/** Accepted recordings (Safari records audio/mp4) and the file extension the provider expects. */
export const VOICE_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export interface VoiceUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface VoiceTranscription {
  text: string;
}

/** "audio/webm;codecs=opus" becomes "audio/webm". */
export function baseMimeType(mimetype: string): string {
  return mimetype.split(';')[0].trim().toLowerCase();
}

/**
 * Turns a spoken day into text. The audio lives in memory for the duration of the request:
 * it is never stored or logged, and the transcript is returned, not kept.
 */
@Injectable()
export class VoiceTranscriptionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly usageRepository: AIChatUsageRepository,
    private readonly llmService: LLMService,
  ) {}

  async transcribe(
    userId: string,
    upload: VoiceUpload | undefined,
  ): Promise<VoiceTranscription> {
    const user = await this.userRepository.findUserById(userId);
    assertNotesConsent(user);

    if (!upload || upload.size === 0) {
      throw new BadRequestException('Aucun enregistrement reçu.');
    }
    if (upload.size > VOICE_MAX_BYTES) {
      throw new PayloadTooLargeException(
        "L'enregistrement dépasse 10 Mo. Raconte ta journée en plusieurs fois.",
      );
    }
    const extension = VOICE_MIME_EXTENSIONS[baseMimeType(upload.mimetype)];
    if (!extension) {
      throw new UnsupportedMediaTypeException(
        "Ce format audio n'est pas pris en charge.",
      );
    }

    const usageId = await reserveDailyUsage(
      this.usageRepository,
      userId,
      'voice',
      'transcriptions vocales',
    );

    try {
      const text = await this.llmService.transcribeAudio({
        audio: upload.buffer,
        fileName: `recording.${extension}`,
        mimeType: baseMimeType(upload.mimetype),
        language: VOICE_LANGUAGE,
      });
      return { text: text.trim() };
    } catch {
      await this.usageRepository.release(usageId);
      throw new ServiceUnavailableException(
        "La transcription a échoué. L'enregistrement n'est pas conservé : recommence.",
      );
    }
  }
}
