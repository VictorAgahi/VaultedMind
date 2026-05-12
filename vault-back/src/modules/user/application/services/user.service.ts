import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { NotificationSubscriptionModel } from '../../../../database/models/notification-subscription.model.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionService: EncryptionService,
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    @InjectRepository(NotificationSubscriptionModel)
    private readonly subscriptionRepository: Repository<NotificationSubscriptionModel>,
  ) {}

  async createUser(email: string, password: string): Promise<User> {
    const emailIndex = this.encryptionService.createBlindIndex(email);
    const existingUser = await this.userRepository.findByEmailIndex(emailIndex);

    if (existingUser) {
      this.logger.warn(`User creation failed: email already exists`);
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.encryptionService.hashPassword(password);

    const user = new User(
      uuidv4(),
      email,
      passwordHash,
      new Date(),
      new Date(),
    );

    const savedUser = await this.userRepository.saveUser(user);
    this.logger.log(`User created successfully with ID: ${savedUser.id}`);
    return savedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    this.logger.log(`Hard deleting user with ID: ${userId}`);
    await this.userRepository.deleteUser(userId);
  }

  async exportUserData(userId: string) {
    this.logger.log(`Exporting all data for user ID: ${userId}`);

    const user = await this.userRepository.findUserById(userId);
    const logs = await this.dailyLogRepository.findByUserId(userId);
    const customFields = await this.customFieldRepository.findByUserId(userId);
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        createdAt: user.createdAt,
      },
      customFields: customFields.map((cf) => ({
        id: cf.id,
        name: cf.name,
        fieldType: cf.fieldType,
        isActive: cf.isActive,
        optionsOrder: cf.optionsOrder,
      })),
      dailyLogs: logs.map((log) => ({
        id: log.id,
        date: log.logDate,
        notes: log.notes,
        values: log.fieldValues?.map((fv) => ({
          fieldId: fv.customFieldId,
          value: fv.value,
        })),
      })),
      notifications: subscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
      })),
    };
  }
}
