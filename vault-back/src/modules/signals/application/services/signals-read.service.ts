import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { NoteSignalsRepository } from '../../../../database/repositories/note-signals.repository.js';
import { DailyLogRepository } from '../../../../database/repositories/daily-log.repository.js';
import type { DailyLog } from '../../../health/domain/entities/daily-log.entity.js';
import { buildSignalViews, type SignalView } from '../../domain/signal-view.js';
import {
  mergeCorrections,
  validateCorrections,
  type CorrectionsInput,
} from '../../domain/signal-corrections.js';
import type { Person } from '../../domain/person.js';

/**
 * Serves fresh signals with the daily logs and records the user's corrections.
 * Signals bound to different notes or settings are never served.
 */
@Injectable()
export class SignalsReadService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly noteSignalsRepository: NoteSignalsRepository,
    private readonly dailyLogRepository: DailyLogRepository,
  ) {}

  /** Signals per log id; a log without fresh signals (or a user without the flag) maps to null. */
  async forLogs(
    userId: string,
    logs: DailyLog[],
  ): Promise<Map<string, SignalView[] | null>> {
    const result = new Map<string, SignalView[] | null>(
      logs.map((log) => [log.id, null]),
    );
    const user = await this.userRepository.findUserById(userId);
    if (!user.preferences.insightsV2Enabled) return result;

    const people = user.preferences.people;
    const rows = await this.noteSignalsRepository.findByDailyLogIds(
      logs.filter((log) => log.notes?.trim()).map((log) => log.id),
    );
    const rowByLog = new Map(rows.map((row) => [row.dailyLogId, row]));

    for (const log of logs) {
      const row = rowByLog.get(log.id);
      if (!row || !log.notes?.trim()) continue;
      if (
        row.sourceHash !==
        this.noteSignalsRepository.computeSourceHash(log.notes, people)
      ) {
        continue;
      }
      const payload = this.noteSignalsRepository.decodePayload(row);
      if (!payload) continue;
      result.set(
        log.id,
        buildSignalViews(
          payload,
          this.noteSignalsRepository.decodeCorrections(row),
          people,
        ),
      );
    }
    return result;
  }

  async saveCorrections(
    userId: string,
    dailyLogId: string,
    incoming: CorrectionsInput,
  ): Promise<SignalView[]> {
    const log = await this.loadOwnedLog(userId, dailyLogId);
    const user = await this.userRepository.findUserById(userId);
    const people: Person[] = user.preferences.people;

    const problems = validateCorrections(incoming, people);
    if (problems.length > 0) throw new BadRequestException(problems);

    const row = await this.noteSignalsRepository.findByDailyLogId(dailyLogId);
    const payload = row && this.noteSignalsRepository.decodePayload(row);
    if (
      !row ||
      !payload ||
      !log.notes ||
      row.sourceHash !==
        this.noteSignalsRepository.computeSourceHash(log.notes, people)
    ) {
      throw new ConflictException('No up-to-date signals for this daily log');
    }

    const corrections = mergeCorrections(
      this.noteSignalsRepository.decodeCorrections(row),
      incoming,
    );
    await this.noteSignalsRepository.saveCorrections(row.id, corrections);
    return buildSignalViews(payload, corrections, people);
  }

  private async loadOwnedLog(userId: string, id: string): Promise<DailyLog> {
    let log: DailyLog;
    try {
      log = await this.dailyLogRepository.findDomainById(id);
    } catch {
      throw new NotFoundException(`Daily log with ID ${id} not found`);
    }
    if (log.userId !== userId) {
      throw new ForbiddenException('You do not own this daily log');
    }
    return log;
  }
}
