import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { NoteSignalsModel } from '../models/note-signals.model.js';
import { DailyLogModel } from '../models/daily-log.model.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import type { Person } from '../../modules/signals/domain/person.js';
import type {
  SignalCorrections,
  SignalPayload,
} from '../../modules/signals/domain/signal-payload.js';
import type { SignalCandidate } from '../../modules/signals/domain/signal-candidate.js';
import {
  SIGNALS_HASH_PURPOSE,
  buildSignalsSourceInput,
} from '../../modules/signals/domain/signal-extraction.js';
import { decideExtraction } from '../../modules/signals/domain/signal-staleness.js';
import { QUESTION_BANK_VERSION } from '../../modules/signals/domain/question-bank.js';

export interface StoredSignals {
  payload: SignalPayload;
  corrections: SignalCorrections;
}

@Injectable()
export class NoteSignalsRepository extends AbstractBaseRepository<NoteSignalsModel> {
  private readonly logger = new Logger(NoteSignalsRepository.name);

  constructor(
    @InjectRepository(NoteSignalsModel)
    noteSignalsRepository: Repository<NoteSignalsModel>,
    private readonly encryptionService: EncryptionService,
  ) {
    super(noteSignalsRepository);
  }

  computeSourceHash(rawNotes: string, people: Person[]): string {
    return this.encryptionService.createKeyedHash(
      buildSignalsSourceInput(rawNotes, people),
      SIGNALS_HASH_PURPOSE,
    );
  }

  /**
   * Logs of a user with non-empty notes whose signals are missing or stale, most recent first.
   * Logs that failed too many times for the current notes are skipped.
   */
  async findLogsNeedingSignals(
    userId: string,
    people: Person[],
    limit: number,
  ): Promise<SignalCandidate[]> {
    const logs = await this.repository.manager
      .getRepository(DailyLogModel)
      .find({
        where: { userId, notes: Not(IsNull()) },
        select: ['id', 'userId', 'notes'],
        order: { logDate: 'DESC' },
      });
    if (logs.length === 0) return [];

    const rows = await this.repository.find({
      where: { dailyLogId: In(logs.map((log) => log.id)) },
    });
    const rowByLog = new Map(rows.map((row) => [row.dailyLogId, row]));

    const candidates: SignalCandidate[] = [];
    for (const log of logs) {
      if (candidates.length >= limit) break;
      const notes = this.decryptText(log.notes);
      if (!notes?.trim()) continue;
      const sourceHash = this.computeSourceHash(notes, people);
      const row = rowByLog.get(log.id) ?? null;
      const decision = decideExtraction(
        row && {
          sourceHash: row.sourceHash,
          hasPayload: row.payload !== null,
          failureCount: row.failureCount,
        },
        sourceHash,
      );
      if (decision !== 'extract') continue;
      candidates.push({
        dailyLogId: log.id,
        userId: log.userId,
        notes,
        sourceHash,
        row: row && {
          sourceHash: row.sourceHash,
          failureCount: row.failureCount,
          corrections: row.corrections,
        },
      });
    }
    return candidates;
  }

  /**
   * Stores a successful extraction. Corrections are kept only while the source hash is unchanged.
   */
  async saveExtraction(
    candidate: SignalCandidate,
    payload: SignalPayload,
  ): Promise<void> {
    const keepCorrections = candidate.row?.sourceHash === candidate.sourceHash;
    await this.upsert(candidate, {
      payload: this.encryptionService.encrypt(JSON.stringify(payload)),
      corrections: keepCorrections
        ? (candidate.row?.corrections ?? null)
        : null,
      failureCount: 0,
      lastFailureAt: null,
    });
  }

  /** Records a failed extraction without ever storing note content. */
  async saveFailure(
    candidate: SignalCandidate,
    failureCount: number,
  ): Promise<void> {
    await this.upsert(candidate, {
      payload: null,
      corrections: null,
      failureCount,
      lastFailureAt: new Date(),
    });
  }

  async findByDailyLogIds(dailyLogIds: string[]): Promise<NoteSignalsModel[]> {
    if (dailyLogIds.length === 0) return [];
    return this.repository.find({
      where: { dailyLogId: In(dailyLogIds), payload: Not(IsNull()) },
    });
  }

  async findByDailyLogId(dailyLogId: string): Promise<NoteSignalsModel | null> {
    return this.repository.findOne({ where: { dailyLogId } });
  }

  async saveCorrections(
    id: string,
    corrections: SignalCorrections,
  ): Promise<void> {
    await this.repository.update(id, {
      corrections:
        Object.keys(corrections).length > 0
          ? this.encryptionService.encrypt(JSON.stringify(corrections))
          : null,
    });
  }

  decodePayload(model: NoteSignalsModel): SignalPayload | null {
    return this.decodeJson<SignalPayload>(model.payload);
  }

  decodeCorrections(model: NoteSignalsModel): SignalCorrections {
    return this.decodeJson<SignalCorrections>(model.corrections) ?? {};
  }

  private async upsert(
    candidate: SignalCandidate,
    values: Pick<
      NoteSignalsModel,
      'payload' | 'corrections' | 'failureCount' | 'lastFailureAt'
    >,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { dailyLogId: candidate.dailyLogId },
    });
    const common = {
      bankVersion: QUESTION_BANK_VERSION,
      sourceHash: candidate.sourceHash,
      ...values,
    };
    if (existing) {
      await this.repository.update(existing.id, common);
    } else {
      await this.repository.save(
        this.repository.create({
          dailyLogId: candidate.dailyLogId,
          userId: candidate.userId,
          ...common,
        }),
      );
    }
  }

  private decodeJson<T>(encrypted: string | null): T | null {
    if (!encrypted) return null;
    try {
      return JSON.parse(this.encryptionService.decrypt(encrypted)) as T;
    } catch (error) {
      this.logger.error(
        'Failed to decode note signals',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private decryptText(encrypted?: string | null): string | null {
    if (!encrypted) return null;
    try {
      return this.encryptionService.decrypt(encrypted);
    } catch {
      return null;
    }
  }
}
