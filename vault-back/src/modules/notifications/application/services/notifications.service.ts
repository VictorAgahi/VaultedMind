import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { NotificationSubscriptionModel } from '../../../../database/models/notification-subscription.model.js';
import { DailyLogService } from '../../../health/application/services/daily-log.service.js';

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
    private readonly dailyLogService: DailyLogService,
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

  private async processReminders(title: string, body: string) {
    const subscriptions =
      (await this.subscriptionRepository.find()) as unknown as INotificationSubscription[];

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: '/dashboard',
    });

    const checkedUsers = new Map<string, boolean>();

    for (const sub of subscriptions) {
      if (!checkedUsers.has(sub.userId)) {
        const hasLogged = await this.dailyLogService.hasLoggedToday(sub.userId);
        checkedUsers.set(sub.userId, hasLogged);
      }

      if (checkedUsers.get(sub.userId)) {
        continue; // Skip sending if user already logged today
      }

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

  @Cron('0 20 * * *', { timeZone: 'Europe/Paris' })
  async sendSoftReminder() {
    this.logger.log('Running 20:00 soft reminder...');
    await this.processReminders(
      "Bonsoir ! L'heure de ton point quotidien 📝",
      "Prends 2 petites minutes pour faire le point sur ta journée. Ton cerveau te remerciera demain pour avoir posé tout ça à l'écrit !",
    );
  }

  @Cron('30 21 * * *', { timeZone: 'Europe/Paris' })
  async sendNormalReminder() {
    this.logger.log('Running 21:30 normal reminder...');
    await this.processReminders(
      'Hey, tu aurais pas oublié quelque chose ? 👀',
      "Ton journal t'attend pour vider ton esprit avant de te détendre. Vider son sac, ça fait du bien !",
    );
  }

  @Cron('30 22 * * *', { timeZone: 'Europe/Paris' })
  async sendInsistentReminder() {
    this.logger.log('Running 22:30 insistent reminder...');
    await this.processReminders(
      "La journée s'achève bientôt... ⏳",
      "Ne laisse pas tes idées s'envoler ou tes tracas t'empêcher de dormir. Viens vite les déposer dans ton Daily Log.",
    );
  }

  @Cron('30 23 * * *', { timeZone: 'Europe/Paris' })
  async sendUrgentReminder() {
    this.logger.log('Running 23:30 urgent reminder...');
    await this.processReminders(
      '🚨 Dernier appel avant minuit !',
      "Plus que 30 minutes pour sauvegarder tes pensées du jour. Ne brise pas ta série, c'est maintenant ou jamais !",
    );
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
