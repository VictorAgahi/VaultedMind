import { Injectable, Logger } from '@nestjs/common';
import { mapWithConcurrency } from '../../../../common/utils/map-with-concurrency.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import type { User } from '../../../user/domain/entities/user.entity.js';
import {
  describeCustomSignal,
  findSignalsToClassify,
  type CustomSignal,
} from '../../domain/custom-signal.js';
import { JevClient } from '../../infrastructure/clients/jev.client.js';
import { classifyConstruct } from './construct-classification.js';

export const CUSTOM_SIGNAL_CONSTRUCT_CONCURRENCY = 4;

/**
 * Classifies what each custom signal measures with one Jev choice question per signal, once:
 * the classification is kept until the label or the question is edited. Only the label and the
 * question are sent, never a note.
 */
@Injectable()
export class CustomSignalConstructService {
  private readonly logger = new Logger(CustomSignalConstructService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jevClient: JevClient,
  ) {}

  /** Returns the user with fresh classifications (unchanged when Jev is not configured or all are up to date). */
  async classifyFor(user: User): Promise<User> {
    const pending = findSignalsToClassify(user.preferences.customSignals);
    if (pending.length === 0 || !this.jevClient.isConfigured()) return user;

    const results = await mapWithConcurrency(
      pending,
      CUSTOM_SIGNAL_CONSTRUCT_CONCURRENCY,
      (signal) => this.classifyOne(signal),
    );
    const classified = results.filter(
      (signal): signal is CustomSignal => signal !== null,
    );
    if (classified.length === 0) return user;

    const byId = new Map(classified.map((signal) => [signal.id, signal]));
    // Re-read the stored list: the user may have edited it while Jev was answering
    const latest = await this.userRepository.findUserById(user.id);
    const merged = latest.preferences.customSignals.map((signal) => {
      const result = byId.get(signal.id);
      return result &&
        describeCustomSignal(result) === describeCustomSignal(signal)
        ? { ...signal, ...result }
        : signal;
    });
    await this.userRepository.updateCustomSignals(user.id, merged);
    latest.preferences = { ...latest.preferences, customSignals: merged };
    return latest;
  }

  private async classifyOne(
    signal: CustomSignal,
  ): Promise<CustomSignal | null> {
    try {
      const construct = await classifyConstruct(
        this.jevClient,
        describeCustomSignal(signal),
      );
      return {
        ...signal,
        construct,
        constructSource: describeCustomSignal(signal),
      };
    } catch (error) {
      this.logger.warn(
        `Construct classification failed for custom signal ${signal.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
