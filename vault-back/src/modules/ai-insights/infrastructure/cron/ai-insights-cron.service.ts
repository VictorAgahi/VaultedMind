import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { AIInsightService } from '../../application/services/ai-insight.service.js';

@Injectable()
export class AIInsightsCronService {
  private readonly logger = new Logger(AIInsightsCronService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly aiInsightService: AIInsightService,
  ) {}

  @Cron('0 21 * * 4', {
    name: 'generate-daily-ai-insights',
    timeZone: 'Europe/Paris',
  })
  async generateDailyInsights() {
    this.logger.log('Starting weekly AI insights generation (Thursday 21h)...');

    try {
      const [users] = await this.userRepository.findAll();
      const usersWithAIEnabled = users.filter((u) => u.aiInsightsEnabled);

      this.logger.log(
        `Found ${usersWithAIEnabled.length} users with AI insights enabled`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const user of usersWithAIEnabled) {
        const insight = await this.aiInsightService.generateInsightForUser(
          user.id,
        );
        if (insight) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      this.logger.log(
        `Daily AI insights generation completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Error in daily insights generation cron:', error);
    }
  }
}
