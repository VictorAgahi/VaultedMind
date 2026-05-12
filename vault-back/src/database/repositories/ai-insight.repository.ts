import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { AIInsightModel } from '../models/ai-insight.model.js';
import { AIInsight } from '../../modules/ai-insights/domain/entities/ai-insight.entity.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import { AIInsightMapper } from '../mappers/ai-insight.mapper.js';

@Injectable()
export class AIInsightRepository extends AbstractBaseRepository<AIInsightModel> {
  private readonly logger = new Logger(AIInsightRepository.name);

  constructor(
    @InjectRepository(AIInsightModel)
    aiInsightRepository: Repository<AIInsightModel>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(aiInsightRepository);
  }

  async findDomainById(id: string): Promise<AIInsight> {
    const model = await this.findById(id);
    this.decryptModel(model);
    return AIInsightMapper.toDomain(model);
  }

  async findByUserId(userId: string, limit: number = 10): Promise<AIInsight[]> {
    const [models] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    models.forEach((model) => this.decryptModel(model));

    return models.map((model) => AIInsightMapper.toDomain(model));
  }

  async saveDomain(entity: AIInsight): Promise<AIInsight> {
    const model = AIInsightMapper.toPersistence(entity);
    model.content = this.encryptionService.encrypt(model.content);

    const savedModel = await this.repository.save(model);

    this.decryptModel(savedModel);
    return AIInsightMapper.toDomain(savedModel);
  }

  async findLastInsightBefore(userId: string): Promise<AIInsight | null> {
    const model = await this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!model) return null;

    this.decryptModel(model);
    return AIInsightMapper.toDomain(model);
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.repository.softDelete({ id, userId } as any);
    if (result.affected === 0) {
      this.logger.warn(
        `Insight ${id} not found for user ${userId} or already deleted`,
      );
    }
  }

  private decryptModel(model: AIInsightModel): void {
    if (model.content) {
      try {
        model.content = this.encryptionService.decrypt(model.content);
      } catch (e) {
        this.logger.error('Failed to decrypt AI insight content', e);
      }
    }
  }
}
