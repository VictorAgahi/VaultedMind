import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './application/services/notifications.service.js';
import { NotificationsController } from './application/controllers/notifications.controller.js';
import { NotificationSubscriptionModel } from '../../database/models/notification-subscription.model.js';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSubscriptionModel])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
