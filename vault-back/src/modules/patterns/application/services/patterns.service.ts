import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { PatternReportRepository } from '../../../../database/repositories/pattern-report.repository.js';
import { SignalsReadService } from '../../../signals/application/services/signals-read.service.js';
import {
  buildDailyMatrix,
  type MatrixDayInput,
} from '../../domain/daily-matrix.js';
import { computePatternReport } from '../../domain/pattern-engine.js';
import type { PatternReport } from '../../domain/pattern-types.js';
import { isTargetableField } from '../../domain/insight-target.js';
import {
  buildPatternReportView,
  type PatternReportView,
} from '../../domain/pattern-report-view.js';

export const RECOMPUTE_COOLDOWN_MS = 15 * 60 * 1000;

export interface NotComputedReport {
  status: 'not_computed';
}

@Injectable()
export class PatternsService {
  private readonly logger = new Logger(PatternsService.name);
  private readonly computing = new Set<string>();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly dailyLogRepository: DailyLogRepository,
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly patternReportRepository: PatternReportRepository,
    private readonly signalsReadService: SignalsReadService,
  ) {}

  async getReport(
    userId: string,
  ): Promise<PatternReportView | NotComputedReport> {
    const stored = await this.patternReportRepository.findByUserId(userId);
    if (!stored) return { status: 'not_computed' };
    return this.toView(userId, stored.report);
  }

  private async toView(
    userId: string,
    report: PatternReport,
  ): Promise<PatternReportView> {
    const [user, fields] = await Promise.all([
      this.userRepository.findUserById(userId),
      this.customFieldRepository.findByUserId(userId),
    ]);
    const targetableIds = new Set(
      fields.filter((field) => isTargetableField(field)).map((f) => f.id),
    );
    const stillValid = new Set(
      user.preferences.insightTargets
        .map((target) => target.fieldId)
        .filter((fieldId) => targetableIds.has(fieldId)),
    );
    return buildPatternReportView(report, stillValid);
  }

  /** On-demand recomputation, at most once every 15 minutes per user. */
  async recompute(userId: string): Promise<PatternReportView> {
    const stored = await this.patternReportRepository.findByUserId(userId);
    const tooSoon =
      stored !== null &&
      Date.now() - stored.computedAt.getTime() < RECOMPUTE_COOLDOWN_MS;
    if (tooSoon || this.computing.has(userId)) {
      throw new HttpException(
        'Patterns were computed recently, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.toView(userId, await this.compute(userId));
  }

  /** Nightly run for every user eligible to the advanced analysis. */
  async computeForEligibleUsers(): Promise<{
    computed: number;
    failed: number;
  }> {
    const users = await this.userRepository.findWithInsightsV2Enabled();
    let computed = 0;
    let failed = 0;
    for (const user of users.filter((candidate) => candidate.canCleanNotes())) {
      try {
        await this.compute(user.id);
        computed++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Pattern computation failed for user ${user.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return { computed, failed };
  }

  async compute(userId: string): Promise<PatternReport> {
    if (this.computing.has(userId)) {
      throw new HttpException(
        'Patterns are already being computed',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.computing.add(userId);
    try {
      const user = await this.userRepository.findUserById(userId);
      const [logs, fields] = await Promise.all([
        this.dailyLogRepository.findByUserId(userId),
        this.customFieldRepository.findByUserId(userId),
      ]);
      const signals = await this.signalsReadService.freshForLogs(userId, logs);

      const days: MatrixDayInput[] = logs.map((log) => ({
        date: log.logDate.toISOString().slice(0, 10),
        fieldValues: new Map(
          (log.fieldValues ?? []).map((value) => [
            value.customFieldId,
            value.value,
          ]),
        ),
        signals: signals.get(log.id) ?? null,
      }));
      const matrix = buildDailyMatrix(days, fields, user.preferences.people);
      const report = computePatternReport(
        matrix,
        user.preferences.insightTargets,
        { userId, computedAt: new Date().toISOString() },
      );
      await this.patternReportRepository.saveForUser(userId, report);
      return report;
    } finally {
      this.computing.delete(userId);
    }
  }
}
