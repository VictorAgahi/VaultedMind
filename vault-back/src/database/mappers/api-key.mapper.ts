import { ApiKey } from '../../modules/auth/domain/entities/api-key.entity.js';
import { ApiKeyModel } from '../models/api-key.model.js';

export class ApiKeyMapper {
  public static toDomain(model: ApiKeyModel): ApiKey {
    return new ApiKey(
      model.id,
      model.name,
      model.hashedKey,
      model.userId,
      model.createdAt,
      model.updatedAt,
      model.lastUsedAt,
    );
  }

  public static toPersistence(entity: ApiKey): ApiKeyModel {
    const model = new ApiKeyModel();
    model.id = entity.id;
    model.name = entity.name;
    model.hashedKey = entity.hashedKey;
    model.userId = entity.userId;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.lastUsedAt = entity.lastUsedAt;
    return model;
  }
}
