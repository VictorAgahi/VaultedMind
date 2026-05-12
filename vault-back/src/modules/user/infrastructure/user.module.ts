import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from '../application/services/user.service.js';
import { NotificationSubscriptionModel } from '../../../database/models/notification-subscription.model.js';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSubscriptionModel])],
  controllers: [],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
