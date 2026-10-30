import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AIChatService } from '../../application/services/ai-chat.service.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { AIChatMessageDto } from '../../application/dtos/ai-insight.dto.js';

@Controller('health/ai-chat')
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req: { user: AuthUser }) {
    return this.aiChatService.getChatStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async chat(
    @Request() req: { user: AuthUser },
    @Body() body: AIChatMessageDto,
  ) {
    const message = body.message;
    if (!message) {
      return { response: "Je n'ai pas reçu de message." };
    }
    return this.aiChatService.getChatResponse(
      req.user.id,
      message,
      body.history ?? [],
    );
  }
}
