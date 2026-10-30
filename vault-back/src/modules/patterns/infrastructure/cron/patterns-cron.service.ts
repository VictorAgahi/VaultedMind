import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PatternsService } from '../../application/services/patterns.service.js';

@Injectable()
export class PatternsCronService {
  private readonly logger = new Logger(PatternsCronService.name);
  private isRunning = false;

  constructor(private readonly patternsService: PatternsService) {}

  @Cron('30 3 * * *', {
    name: 'compute-personal-patterns',
    timeZone: 'Europe/Paris',
  })
  async computePatterns(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Previous patterns run is still in progress. Skipping.');
      return;
    }

    this.isRunning = true;
    try {
      const { computed, failed } =
        await this.patternsService.computeForEligibleUsers();
      this.logger.log(
        `Patterns computation completed. Computed: ${computed}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('Error in patterns cron:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
