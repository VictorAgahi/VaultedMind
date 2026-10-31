import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import { PatternReportRepository } from '../../../../database/repositories/pattern-report.repository.js';
import { FieldConstructService } from '../../../signals/application/services/field-construct.service.js';
import { signalContextOf } from '../../../signals/domain/signal-context.js';
import { CustomSignalConstructService } from '../../../signals/application/services/custom-signal-construct.service.js';
import { SignalsReadService } from '../../../signals/application/services/signals-read.service.js';
import {
  buildDailyMatrix,
  type MatrixDayInput,
} from '../../domain/daily-matrix.js';
import type { PatternReport } from '../../domain/pattern-types.js';
import {
  isTargetUsable,
  isValueTarget,
  targetIdentity,
} from '../../domain/insight-target.js';
import {
  MAX_OBVIOUS_OVERRIDES,
  type PatternObviousOverrides,
} from '../../domain/pattern-obviousness.js';
import { PatternEngineRunner } from '../../infrastructure/workers/pattern-engine.runner.js';
import { ObviousnessService } from './obviousness.service.js';
import { linkedFieldMeasures } from '../../domain/pattern-sources.js';
import {
  buildPatternReportView,
  type PatternReportView,
} from '../../domain/pattern-report-view.js';

export const MAX_FIELD_VALUES = 30;
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
    private readonly fieldConstructService: FieldConstructService,
    private readonly customSignalConstructService: CustomSignalConstructService,
    private readonly obviousnessService: ObviousnessService,
    private readonly engineRunner: PatternEngineRunner,
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
    const fieldById = new Map(fields.map((field) => [field.id, field]));
    const stillValid = new Set(
      user.preferences.insightTargets
        .filter((target) =>
          isTargetUsable(target, fieldById.get(target.fieldId)),
        )
        .map((target) => targetIdentity(target.fieldId, target.value)),
    );
    const measures = linkedFieldMeasures(fields);
    return buildPatternReportView(
      report,
      stillValid,
      user.preferences.patternObviousOverrides ?? {},
      user.preferences.trackedSubject,
      measures,
    );
  }

  /** Stores (or with null, removes) the user's verdict on whether a link is obvious. */
  async setObviousOverride(
    userId: string,
    findingKey: string,
    obvious: boolean | null,
  ): Promise<PatternObviousOverrides> {
    const user = await this.userRepository.findUserById(userId);
    const overrides = { ...(user.preferences.patternObviousOverrides ?? {}) };
    if (obvious === null) {
      delete overrides[findingKey];
    } else if (
      !(findingKey in overrides) &&
      Object.keys(overrides).length >= MAX_OBVIOUS_OVERRIDES
    ) {
      throw new BadRequestException('Too many obvious overrides');
    } else {
      overrides[findingKey] = obvious;
    }
    user.preferences = {
      ...user.preferences,
      patternObviousOverrides: overrides,
    };
    await this.userRepository.saveUser(user);
    return overrides;
  }

  /** Distinct values logged for a field, most frequent first: the choices of a value target. */
  async listFieldValues(userId: string, fieldId: string): Promise<string[]> {
    const [logs, fields] = await Promise.all([
      this.dailyLogRepository.findByUserId(userId),
      this.customFieldRepository.findByUserId(userId),
    ]);
    if (!fields.some((field) => field.id === fieldId)) return [];
    const counts = new Map<string, number>();
    for (const log of logs) {
      for (const value of log.fieldValues ?? []) {
        const text = value.value?.trim();
        if (value.customFieldId !== fieldId || !text) continue;
        counts.set(text, (counts.get(text) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, MAX_FIELD_VALUES)
      .map(([text]) => text);
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
      const loadedUser = await this.userRepository.findUserById(userId);
      // Custom signal texts go to Jev only for users who allowed the advanced analysis
      const user = loadedUser.canCleanNotes()
        ? await this.customSignalConstructService.classifyFor(loadedUser)
        : loadedUser;
      const [logs, loadedFields] = await Promise.all([
        this.dailyLogRepository.findByUserId(userId),
        this.customFieldRepository.findByUserId(userId),
      ]);
      // Field names go to Jev only for users who allowed the advanced analysis
      const mayUseJev = user.canCleanNotes();
      const fields =
        mayUseJev &&
        (await this.fieldConstructService.classifyFields(loadedFields)) > 0
          ? await this.customFieldRepository.findByUserId(userId)
          : loadedFields;
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
      const targets = user.preferences.insightTargets;
      const matrix = buildDailyMatrix(
        days,
        fields,
        signalContextOf(user.preferences),
        targets.filter(isValueTarget),
      );
      const computed = await this.engineRunner.run({
        matrix,
        targets,
        options: { userId, computedAt: new Date().toISOString() },
      });
      const previous = await this.patternReportRepository.findByUserId(userId);
      const report =
        mayUseJev && computed.status === 'ok'
          ? await this.obviousnessService.annotate(
              computed,
              previous?.report ?? null,
            )
          : computed;
      await this.patternReportRepository.saveForUser(userId, report);
      return report;
    } finally {
      this.computing.delete(userId);
    }
  }
}
