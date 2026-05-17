import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AIChatService } from '../../application/services/ai-chat.service.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';

@Controller('health/ai-chat')
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async chat(
    @Request() req: { user: AuthUser },
    @Body('message') message: string,
  ) {
    if (!message) {
      return { response: "Je n'ai pas reçu de message." };
    }
    const response = await this.aiChatService.getChatResponse(
      req.user.id,
      message,
    );
    return { response };
  }
}
