import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JournalSignalsService } from '../../application/services/journal-signals.service.js';

@Injectable()
export class JournalSignalsCronService {
  private readonly logger = new Logger(JournalSignalsCronService.name);
  private isRunning = false;

  constructor(private readonly journalSignalsService: JournalSignalsService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'extract-note-signals' })
  async extractNoteSignals(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Previous signals extraction run is still in progress. Skipping.',
      );
      return;
    }

    this.isRunning = true;
    try {
      const { extracted, failed } =
        await this.journalSignalsService.extractPendingSignals();
      if (extracted > 0 || failed > 0) {
        this.logger.log(
          `Signals extraction completed. Extracted: ${extracted}, Failed: ${failed}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in signals extraction cron:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
