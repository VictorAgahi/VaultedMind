import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { PatternReportModel } from '../models/pattern-report.model.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import type { PatternReport } from '../../modules/patterns/domain/pattern-types.js';

export interface StoredPatternReport {
  report: PatternReport;
  computedAt: Date;
}

@Injectable()
export class PatternReportRepository extends AbstractBaseRepository<PatternReportModel> {
  private readonly logger = new Logger(PatternReportRepository.name);

  constructor(
    @InjectRepository(PatternReportModel)
    patternReportRepository: Repository<PatternReportModel>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(patternReportRepository);
  }

  /** The user's report, or null when none exists or it cannot be decoded. */
  async findByUserId(userId: string): Promise<StoredPatternReport | null> {
    const model = await this.repository.findOne({ where: { userId } });
    if (!model) return null;
    try {
      const report = JSON.parse(
        this.encryptionService.decrypt(model.payload),
      ) as PatternReport;
      return { report, computedAt: model.computedAt };
    } catch (error) {
      this.logger.error(
        'Failed to decode pattern report',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /** One row per user: the previous report is overwritten. */
  async saveForUser(userId: string, report: PatternReport): Promise<void> {
    const values = {
      engineVersion: report.engineVersion,
      computedAt: new Date(report.computedAt),
      payload: this.encryptionService.encrypt(JSON.stringify(report)),
    };
    const existing = await this.repository.findOne({ where: { userId } });
    if (existing) {
      await this.repository.update(existing.id, values);
    } else {
      await this.repository.save(this.repository.create({ userId, ...values }));
    }
  }
}
