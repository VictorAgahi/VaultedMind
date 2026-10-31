import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { NoteSignalsRepository } from '../../../../database/repositories/note-signals.repository.js';
import { JevClient } from '../../infrastructure/clients/jev.client.js';
import {
  buildJevQuestions,
  mapResponseToPayload,
} from '../../domain/signal-extraction.js';
import { pseudonymize } from '../../domain/pseudonymize.js';
import { nextFailureCount } from '../../domain/signal-staleness.js';
import type { SignalCandidate } from '../../domain/signal-candidate.js';
import {
  signalContextOf,
  type SignalContext,
} from '../../domain/signal-context.js';
import { subjectPseudonym } from '../../domain/subject-pseudonym.js';

export const SIGNALS_BATCH_SIZE = 20;

export interface SignalsExtractionSummary {
  extracted: number;
  failed: number;
  skipped: boolean;
}

/**
 * Extracts structured signals from raw notes with Jev for users who opted in to the advanced analysis.
 * Only pseudonymized text is sent; nothing derived from a note is stored unencrypted.
 */
@Injectable()
export class JournalSignalsService {
  private readonly logger = new Logger(JournalSignalsService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly noteSignalsRepository: NoteSignalsRepository,
    private readonly jevClient: JevClient,
  ) {}

  async extractPendingSignals(
    batchSize: number = SIGNALS_BATCH_SIZE,
  ): Promise<SignalsExtractionSummary> {
    const summary: SignalsExtractionSummary = {
      extracted: 0,
      failed: 0,
      skipped: false,
    };

    const users = await this.userRepository.findWithInsightsV2Enabled();
    const eligibleUsers = users.filter((user) => user.canCleanNotes());
    if (eligibleUsers.length === 0) return summary;

    if (!this.jevClient.isConfigured()) {
      this.logger.warn(
        'JEV_API_KEY or JEV_API_BASE is missing: note signals extraction skipped.',
      );
      summary.skipped = true;
      return summary;
    }

    let remaining = batchSize;
    for (const user of eligibleUsers) {
      if (remaining <= 0) break;
      const context = signalContextOf(user.preferences);
      const candidates =
        await this.noteSignalsRepository.findLogsNeedingSignals(
          user.id,
          context,
          remaining,
        );
      for (const candidate of candidates) {
        const succeeded = await this.extractOne(candidate, context);
        if (succeeded) summary.extracted++;
        else summary.failed++;
        remaining--;
      }
    }
    return summary;
  }

  private async extractOne(
    candidate: SignalCandidate,
    context: SignalContext,
  ): Promise<boolean> {
    try {
      const response = await this.jevClient.analyze(
        pseudonymize(candidate.notes, [
          ...context.people,
          ...subjectPseudonym(context.subject),
        ]),
        buildJevQuestions(context),
      );
      const payload = mapResponseToPayload(response, context, candidate.notes);
      await this.noteSignalsRepository.saveExtraction(candidate, payload);
      return true;
    } catch (error) {
      // Never log the note or the provider body: only the log id and the error message
      this.logger.error(
        `Signals extraction failed for daily log ${candidate.dailyLogId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      await this.recordFailure(candidate);
      return false;
    }
  }

  private async recordFailure(candidate: SignalCandidate): Promise<void> {
    try {
      await this.noteSignalsRepository.saveFailure(
        candidate,
        nextFailureCount(candidate.row, candidate.sourceHash),
      );
    } catch (error) {
      this.logger.error(
        `Could not record signals failure for daily log ${candidate.dailyLogId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
