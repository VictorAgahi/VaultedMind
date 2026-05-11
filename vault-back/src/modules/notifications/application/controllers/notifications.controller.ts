import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from '../../application/services/notifications.service.js';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';

import { SubscribeDto } from '../dtos/subscribe.dto.js';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(
    @Request() req: { user: { id: string } },
    @Body() subscription: SubscribeDto,
  ) {
    this.logger.log(`Received subscription request for user: ${req.user.id}`);
    return this.notificationsService.saveSubscription(
      req.user.id,
      subscription,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('test')
  testNotification(@Request() req: { user: { id: string } }) {
    this.logger.log(`Test notification requested for user: ${req.user.id}`);

    // We send it in 30 seconds
    setTimeout(() => {
      this.notificationsService
        .sendTestNotification(req.user.id)
        .catch((err) => {
          this.logger.error(
            `Failed to send test notification to user ${req.user.id}:`,
            err,
          );
        });
    }, 30000);

    return { message: 'Notification test programmée dans 30 secondes.' };
  }
}
