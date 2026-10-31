import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import type { DailyLogCleanupCandidate } from '../../../health/domain/entities/daily-log-cleanup-candidate.js';
import type { TrackedSubject } from '../../../signals/domain/tracked-subject.js';
import { LLMService } from './llm.service.js';
import { buildNoteCleanupPrompt } from './note-cleanup-prompt.js';

export const NOTE_CLEANUP_BATCH_SIZE = 20;
const NOTE_CLEANUP_MAX_TOKENS = 6000;
const NOTE_CLEANUP_MIN_LENGTH_RATIO = 0.5;

export interface NoteCleanupSummary {
  cleaned: number;
  failed: number;
}

/**
 * Rewrites dictated notes into readable text for users who opted in to the advanced analysis.
 * The raw notes stay the source of truth: only the separate clean column is written.
 */
@Injectable()
export class NoteCleanupService {
  private readonly logger = new Logger(NoteCleanupService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly llmService: LLMService,
  ) {}

  async cleanPendingNotes(
    batchSize: number = NOTE_CLEANUP_BATCH_SIZE,
  ): Promise<NoteCleanupSummary> {
    const summary: NoteCleanupSummary = { cleaned: 0, failed: 0 };

    const users = await this.userRepository.findWithInsightsV2Enabled();
    const eligibleUsers = users.filter((user) => user.canCleanNotes());

    let remaining = batchSize;
    for (const user of eligibleUsers) {
      if (remaining <= 0) break;
      const candidates = await this.dailyLogRepository.findLogsNeedingCleanup(
        user.id,
        remaining,
      );
      for (const candidate of candidates) {
        const succeeded = await this.cleanOne(
          candidate,
          user.preferences.trackedSubject,
        );
        if (succeeded) summary.cleaned++;
        else summary.failed++;
        remaining--;
      }
    }

    return summary;
  }

  private async cleanOne(
    candidate: DailyLogCleanupCandidate,
    subject: TrackedSubject,
  ): Promise<boolean> {
    try {
      const rewritten = await this.llmService.generateTextWithConfig(
        buildNoteCleanupPrompt(candidate.notes, subject),
        {
          model: this.llmService.getAnalysisModel(),
          maxTokens: NOTE_CLEANUP_MAX_TOKENS,
          reasoningEffort: 'low',
        },
      );
      const cleanNotes = rewritten.trim();
      if (!cleanNotes) {
        throw new Error('Empty rewrite');
      }
      // A rewrite only drops filler words: a much shorter one was truncated or lost content
      if (
        cleanNotes.length <
        candidate.notes.trim().length * NOTE_CLEANUP_MIN_LENGTH_RATIO
      ) {
        throw new Error('Rewrite too short, likely truncated');
      }
      await this.dailyLogRepository.saveCleanNotes(
        candidate.id,
        candidate.notes,
        cleanNotes,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Note cleanup failed for daily log ${candidate.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
