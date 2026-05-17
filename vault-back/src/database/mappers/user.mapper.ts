import { Injectable } from '@nestjs/common';
import { User } from '../../modules/user/domain/entities/user.entity.js';
import { UserModel } from '../models/user.model.js';
import { EncryptionService } from '../../common/security/encryption.service.js';

@Injectable()
export class UserMapper {
  constructor(private readonly encryptionService: EncryptionService) {}

  public toDomain(model: UserModel): User {
    // Decrypt email for the domain
    const plainEmail = this.encryptionService.decrypt(model.emailEncrypted);

    return new User(
      model.id,
      plainEmail,
      model.passwordHash,
      model.createdAt,
      model.updatedAt,
      model.aiInsightsEnabled,
      model.aiContext,
      model.deletedAt,
    );
  }

  public toPersistence(entity: User): UserModel {
    const model = new UserModel();
    model.id = entity.id;

    // Encrypt email and create blind index for persistence
    model.emailEncrypted = this.encryptionService.encrypt(entity.email);
    model.emailIndex = this.encryptionService.createBlindIndex(entity.email);

    model.passwordHash = entity.passwordHash;
    model.aiInsightsEnabled = entity.aiInsightsEnabled;
    model.aiContext = entity.aiContext;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.deletedAt = entity.deletedAt;
    return model;
  }
}
