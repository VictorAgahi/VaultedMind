import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { NotificationSubscriptionModel } from '../../../../database/models/notification-subscription.model.js';
import { DailyLogService } from '../../../health/application/services/daily-log.service.js';
import { isAllowedPushEndpoint } from '../utils/push-endpoint.util.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import {
  isReminderDue,
  toLocalMoment,
} from '../../domain/reminder-schedule.js';

const REMINDER_PAYLOAD = JSON.stringify({
  title: "Comment s'est passée votre journée ?",
  body: 'Une minute pour la noter, quand vous en avez envie.',
  url: '/dashboard?new=1&voice=1',
});

interface PushSubscription {
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
    private readonly userRepository: UserRepository,
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

  async deleteSubscriptions(userId: string, endpoint?: string): Promise<void> {
    await this.subscriptionRepository.delete(
      endpoint ? { userId, endpoint } : { userId },
    );
  }

  /**
   * One gentle reminder per day, at the time each user chose, in their own time zone.
   * Skipped when the user already logged that local day.
   */
  @Cron('*/15 * * * *')
  async sendDueReminders(now: Date = new Date()): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find();
    const subscriptionsByUser = new Map<
      string,
      NotificationSubscriptionModel[]
    >();
    for (const sub of subscriptions) {
      const list = subscriptionsByUser.get(sub.userId) ?? [];
      list.push(sub);
      subscriptionsByUser.set(sub.userId, list);
    }

    for (const [userId, userSubscriptions] of subscriptionsByUser) {
      const user = await this.userRepository.findUserById(userId);
      if (!isReminderDue(now, user.preferences)) continue;

      const localDate = toLocalMoment(now, user.preferences.timezone).date;
      // Marked first so a slow push service never causes a second reminder the same day
      await this.userRepository.markReminderSent(userId, localDate);
      if (await this.dailyLogService.hasLoggedOn(userId, localDate)) continue;

      for (const sub of userSubscriptions) {
        await this.sendToSubscription(sub, REMINDER_PAYLOAD);
      }
    }
  }

  private async sendToSubscription(
    sub: NotificationSubscriptionModel,
    payload: string,
  ): Promise<void> {
    // Rows stored before endpoint validation could point to arbitrary hosts (SSRF)
    if (!isAllowedPushEndpoint(sub.endpoint)) {
      this.logger.warn(
        `Deleting subscription ${sub.id} with disallowed push endpoint`,
      );
      await this.subscriptionRepository.delete(sub.id);
      return;
    }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
      );
    } catch (error) {
      const webPushError = error as { statusCode?: number };
      if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
        this.logger.warn(
          `Subscription for user ${sub.userId} expired, deleting.`,
        );
        await this.subscriptionRepository.delete(sub.id);
      } else {
        this.logger.error(`Error sending push to user ${sub.userId}`, error);
      }
    }
  }

  async sendTestNotification(userId: string) {
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
    });

    const payload = JSON.stringify({
      title: 'Notification de test',
      body: 'Les rappels fonctionnent sur cet appareil.',
      url: '/profile',
    });

    for (const sub of subscriptions) {
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        this.logger.warn(
          `Skipping subscription ${sub.id} with disallowed push endpoint`,
        );
        continue;
      }
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload,
        );
      } catch (error) {
        this.logger.error(`Error sending test push to user ${userId}`, error);
      }
    }
  }
}
