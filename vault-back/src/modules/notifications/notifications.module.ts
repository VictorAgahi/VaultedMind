import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './application/services/notifications.service.js';
import { NotificationsController } from './application/controllers/notifications.controller.js';
import { NotificationSubscriptionModel } from '../../database/models/notification-subscription.model.js';
import { HealthModule } from '../health/infrastructure/health.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationSubscriptionModel]),
    HealthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
