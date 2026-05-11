import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from '../../application/services/notifications.service.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

interface SubscribeDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(
    @Request() req: { user: { id: string } },
    @Body() subscription: SubscribeDto,
  ) {
    return this.notificationsService.saveSubscription(
      req.user.id,
      subscription,
    );
  }
}
