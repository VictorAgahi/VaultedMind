import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NoteCleanupService } from '../../application/services/note-cleanup.service.js';

@Injectable()
export class NoteCleanupCronService {
  private readonly logger = new Logger(NoteCleanupCronService.name);
  private isRunning = false;

  constructor(private readonly noteCleanupService: NoteCleanupService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'clean-dictated-notes' })
  async cleanDictatedNotes(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Previous note cleanup run is still in progress. Skipping.',
      );
      return;
    }

    this.isRunning = true;
    try {
      const { cleaned, failed } =
        await this.noteCleanupService.cleanPendingNotes();
      if (cleaned > 0 || failed > 0) {
        this.logger.log(
          `Note cleanup completed. Cleaned: ${cleaned}, Failed: ${failed}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in note cleanup cron:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
