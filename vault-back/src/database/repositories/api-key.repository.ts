import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { ApiKeyModel } from '../models/api-key.model.js';

@Injectable()
export class ApiKeyRepository extends AbstractBaseRepository<ApiKeyModel> {
  constructor(
    @InjectRepository(ApiKeyModel)
    apiKeyRepository: Repository<ApiKeyModel>,
  ) {
    super(apiKeyRepository);
  }

  async findByUserId(userId: string): Promise<ApiKeyModel[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async save(model: ApiKeyModel): Promise<ApiKeyModel> {
    return this.repository.save(model);
  }

  async findOne(
    options: FindOneOptions<ApiKeyModel>,
  ): Promise<ApiKeyModel | null> {
    return this.repository.findOne(options);
  }

  async remove(model: ApiKeyModel): Promise<void> {
    await this.repository.remove(model);
  }
}
