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
import { Body } from '@nestjs/common';

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
      1000,
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
          "Impossible de générer l'analyse. Assure-toi d'avoir activé les analyses IA, d'avoir au moins un champ personnalisé actif, et d'avoir saisi au moins 3 entrées de journal dans les 30 derniers jours.",
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
    const enabled = await this.aiInsightService.getAIInsightsStatus(
      req.user.id,
    );
    return { enabled };
  }

  @UseGuards(JwtAuthGuard)
  @Get('context')
  async getContext(@Request() req: { user: AuthUser }) {
    const context = await this.aiInsightService.getAIContext(req.user.id);
    return { context };
  }

  @UseGuards(JwtAuthGuard)
  @Post('context')
  async updateContext(
    @Request() req: { user: AuthUser },
    @Body('context') context: string,
  ) {
    await this.aiInsightService.updateAIContext(req.user.id, context);
    return { message: 'AI Context updated successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('context/optimize')
  async optimizeContext(@Body() body: { context: string }) {
    const { context } = body;
    if (!context || context.trim() === '') {
      throw new BadRequestException(
        'Le contexte ne peut pas être vide pour être optimisé.',
      );
    }
    const optimized = await this.aiInsightService.optimizeAIContext(context);
    return { optimized };
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
