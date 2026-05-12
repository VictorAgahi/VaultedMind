import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AIInsightService } from '../../application/services/ai-insight.service.js';
import { AIInsightResponseDto } from '../../application/dtos/ai-insight.dto.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';

@Controller('health/ai-insights')
export class AIInsightController {
  constructor(private readonly aiInsightService: AIInsightService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getInsights(
    @Request() req: { user: AuthUser },
  ): Promise<AIInsightResponseDto[]> {
    const insights = await this.aiInsightService.getInsightsForUser(
      req.user.id,
      5,
    );
    return insights.map((insight) => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      content: insight.content,
      metadata: insight.metadata,
      createdAt: insight.createdAt,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateInsight(@Request() req: { user: AuthUser }) {
    try {
      const insight = await this.aiInsightService.generateInsightForUser(
        req.user.id,
      );
      if (!insight) {
        throw new BadRequestException(
          'Cannot generate insight. Please ensure AI insights are enabled and you have recent logs.',
        );
      }
      return {
        id: insight.id,
        type: insight.type,
        title: insight.title,
        content: insight.content,
        metadata: insight.metadata,
        createdAt: insight.createdAt,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate insight: ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('enable')
  async enableAIInsights(@Request() req: { user: AuthUser }) {
    await this.aiInsightService.enableAIInsights(req.user.id);
    return { message: 'AI Insights enabled' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable')
  async disableAIInsights(@Request() req: { user: AuthUser }) {
    await this.aiInsightService.disableAIInsights(req.user.id);
    return { message: 'AI Insights disabled' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req: { user: AuthUser }) {
    const enabled = await this.aiInsightService.getAIInsightsStatus(req.user.id);
    return { enabled };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteInsight(
    @Request() req: { user: AuthUser },
    @Param('id') id: string,
  ) {
    await this.aiInsightService.deleteAIInsight(req.user.id, id);
    return { message: 'Insight deleted' };
  }
}
