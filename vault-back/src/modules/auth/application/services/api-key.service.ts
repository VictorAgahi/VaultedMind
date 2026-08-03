import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKeyRepository } from '../../../../database/repositories/api-key.repository.js';
import { ApiKeyMapper } from '../../../../database/mappers/api-key.mapper.js';
import { ApiKey } from '../../domain/entities/api-key.entity.js';
import { ApiKeyModel } from '../../../../database/models/api-key.model.js';

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async create(
    userId: string,
    name: string,
  ): Promise<{ apiKey: ApiKey; secretKey: string }> {
    // Generate a secure random token
    const secretValue = crypto.randomBytes(32).toString('base64url');

    // Hash the token for storage
    const saltRounds = 10;
    const hashedKey = await bcrypt.hash(secretValue, saltRounds);

    const model = new ApiKeyModel();
    model.name = name;
    model.hashedKey = hashedKey;
    model.userId = userId;

    const savedModel = await this.apiKeyRepository.save(model);

    // The final secret key given to the user includes the DB ID so we can look it up in O(1)
    const secretKey = `vm_${savedModel.id}.${secretValue}`;

    return {
      apiKey: ApiKeyMapper.toDomain(savedModel),
      secretKey,
    };
  }

  async findAllForUser(userId: string): Promise<ApiKey[]> {
    const models = await this.apiKeyRepository.findByUserId(userId);
    return models.map((model) => ApiKeyMapper.toDomain(model));
  }

  async delete(userId: string, id: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    await this.apiKeyRepository.remove(apiKey);
  }

  async verifyAndGetUserId(fullSecretKey: string): Promise<string | null> {
    if (!fullSecretKey.startsWith('vm_')) return null;

    const parts = fullSecretKey.substring(3).split('.');
    if (parts.length !== 2) return null;

    const [keyId, secretValue] = parts;

    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId },
    });

    if (!apiKey) return null;

    const isValid = await bcrypt.compare(secretValue, apiKey.hashedKey);
    if (!isValid) return null;

    apiKey.lastUsedAt = new Date();
    this.apiKeyRepository.save(apiKey).catch((err) => console.error(err));

    return apiKey.userId;
  }
}
