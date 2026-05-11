import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { NotificationSubscriptionModel } from '../../../../database/models/notification-subscription.model.js';

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface INotificationSubscription {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationSubscriptionModel)
    private readonly subscriptionRepository: Repository<NotificationSubscriptionModel>,
    private readonly configService: ConfigService,
  ) {
    const vapidPublicKey =
      this.configService.getOrThrow<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey =
      this.configService.getOrThrow<string>('VAPID_PRIVATE_KEY');
    const vapidEmail = this.configService.getOrThrow<string>('VAPID_EMAIL');

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  }

  async saveSubscription(userId: string, subscription: PushSubscription) {
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint: subscription.endpoint, userId },
    });

    if (existing) {
      existing.keys = subscription.keys;
      existing.expirationTime = subscription.expirationTime ?? undefined;
      return this.subscriptionRepository.save(existing);
    }

    const newSub = this.subscriptionRepository.create({
      userId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? undefined,
      keys: subscription.keys,
    });

    return this.subscriptionRepository.save(newSub);
  }

  @Cron('30 18 * * *') // Every day at 18:30
  async sendDailyReminders() {
    this.logger.log('Running daily log reminder cron job...');

    // Logic to find users who haven't filled their log today
    // For now, we'll send it to everyone who has a subscription
    // In a real app, you'd join with the 'logs' table

    const subscriptions =
      (await this.subscriptionRepository.find()) as unknown as INotificationSubscription[];

    const notificationPayload = JSON.stringify({
      title: 'Pense à ton Daily Log !',
      body: "Prends une minute pour enregistrer tes pensées d'aujourd'hui.",
      url: '/dashboard',
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          notificationPayload,
        );
      } catch (error: any) {
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410) {
          this.logger.warn(
            `Subscription for user ${sub.userId} expired, deleting.`,
          );
          await this.subscriptionRepository.delete(sub.id);
        } else {
          this.logger.error(`Error sending push to user ${sub.userId}:`, error);
        }
      }
    }
  }

  async sendTestNotification(userId: string) {
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
    });

    const payload = JSON.stringify({
      title: 'Test de Notification !',
      body: 'Ceci est une notification de test envoyée 30 secondes après ta demande.',
      url: '/profile',
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
        );
      } catch (error: any) {
        this.logger.error(`Error sending test push to user ${userId}:`, error);
      }
    }
  }
}
