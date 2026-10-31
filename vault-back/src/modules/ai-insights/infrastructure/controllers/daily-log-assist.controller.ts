import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import {
  AutofillDraftDto,
  AutofillDraftResponseDto,
  VoiceTranscriptionResponseDto,
} from '../../application/dtos/autofill-draft.dto.js';
import { AutofillDraftService } from '../../application/services/autofill-draft.service.js';
import {
  VOICE_MAX_BYTES,
  VoiceTranscriptionService,
  type VoiceUpload,
} from '../../application/services/voice-transcription.service.js';

/** "Raconter ma journée": speech to text, then factual proposals for the entry form. */
@Controller('health/daily-logs')
@UseGuards(JwtAuthGuard)
export class DailyLogAssistController {
  constructor(
    private readonly voiceTranscriptionService: VoiceTranscriptionService,
    private readonly autofillDraftService: AutofillDraftService,
  ) {}

  @Post('voice-transcription')
  @UseInterceptors(
    FileInterceptor('audio', {
      // No storage option: the file stays in memory and never touches the disk
      limits: { fileSize: VOICE_MAX_BYTES, files: 1 },
    }),
  )
  async transcribe(
    @UploadedFile() file: VoiceUpload | undefined,
    @Req() req: { user: AuthUser },
  ): Promise<VoiceTranscriptionResponseDto> {
    return this.voiceTranscriptionService.transcribe(
      req.user.id,
      file && {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
    );
  }

  @Post('autofill-draft')
  async autofillDraft(
    @Body() dto: AutofillDraftDto,
    @Req() req: { user: AuthUser },
  ): Promise<AutofillDraftResponseDto> {
    return this.autofillDraftService.draft(
      req.user.id,
      dto.text,
      dto.logDate.slice(0, 10),
    );
  }
}
