import { jest } from '@jest/globals';
import { JournalSignalsService } from './journal-signals.service.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';
import type { NoteSignalsRepository } from '../../../../database/repositories/note-signals.repository.js';
import type { JevClient } from '../../infrastructure/clients/jev.client.js';
import type { SignalCandidate } from '../../domain/signal-candidate.js';
import type { SignalPayload } from '../../domain/signal-payload.js';
import type { SignalContext } from '../../domain/signal-context.js';
import type { Person } from '../../domain/person.js';
import type { TrackedSubject } from '../../domain/tracked-subject.js';
import type { CustomSignal } from '../../domain/custom-signal.js';

const people: Person[] = [{ id: 'p1', alias: 'Compagne', variants: ['Marie'] }];

const buildUser = (
  id: string,
  enabled = true,
  subject: TrackedSubject = { kind: 'SELF' },
  customSignals: CustomSignal[] = [],
): User =>
  new User(
    id,
    `${id}@t.com`,
    'h',
    new Date(),
    new Date(),
    false,
    undefined,
    false,
    undefined,
    {
      reminderEnabled: true,
      reminderTime: '21:00',
      timezone: 'Europe/Paris',
      aiIncludeNotes: true,
      insightsV2Enabled: enabled,
      people,
      trackedSubject: subject,
      customSignals,
      insightTargets: [],
      patternObviousOverrides: {},
    },
    { aiConsentAt: new Date() },
  );

const candidate = (id: string, failureCount?: number): SignalCandidate => ({
  dailyLogId: id,
  userId: 'u1',
  notes: 'Dispute avec Marie',
  sourceHash: 'h-new',
  bankVersion: 'v1',
  row:
    failureCount === undefined
      ? null
      : { sourceHash: 'h-new', failureCount, corrections: null },
});

function setup(
  options: {
    configured?: boolean;
    candidates?: SignalCandidate[];
    user?: User;
  } = {},
) {
  const users = {
    findWithInsightsV2Enabled: jest
      .fn<() => Promise<User[]>>()
      .mockResolvedValue([options.user ?? buildUser('u1')]),
  };
  const signals = {
    findLogsNeedingSignals: jest
      .fn<
        (u: string, c: SignalContext, l: number) => Promise<SignalCandidate[]>
      >()
      .mockResolvedValue(options.candidates ?? []),
    saveExtraction: jest
      .fn<(c: SignalCandidate, p: SignalPayload) => Promise<void>>()
      .mockResolvedValue(undefined),
    saveFailure: jest
      .fn<(c: SignalCandidate, n: number) => Promise<void>>()
      .mockResolvedValue(undefined),
  };
  const jev = {
    isConfigured: jest
      .fn<() => boolean>()
      .mockReturnValue(options.configured ?? true),
    analyze: jest
      .fn<
        (s: string, q: object) => Promise<{ model: string; answers: object }>
      >()
      .mockResolvedValue({ model: 'jev-1.14.0', answers: {} }),
  };
  const service = new JournalSignalsService(
    users as unknown as UserRepository,
    signals as unknown as NoteSignalsRepository,
    jev as unknown as JevClient,
  );
  return { service, users, signals, jev };
}

describe('JournalSignalsService', () => {
  it('should send only pseudonymized text and store the extraction', async () => {
    // Arrange
    const { service, signals, jev } = setup({ candidates: [candidate('l1')] });

    // Act
    const summary = await service.extractPendingSignals();

    // Assert
    expect(summary).toEqual({ extracted: 1, failed: 0, skipped: false });
    expect(jev.analyze.mock.calls[0][0]).toBe('Dispute avec [Compagne]');
    expect(signals.saveExtraction).toHaveBeenCalledTimes(1);
  });

  it('should skip without calling anything when Jev is not configured', async () => {
    // Arrange
    const { service, signals, jev } = setup({
      configured: false,
      candidates: [candidate('l1')],
    });

    // Act
    const summary = await service.extractPendingSignals();

    // Assert
    expect(summary.skipped).toBe(true);
    expect(jev.analyze).not.toHaveBeenCalled();
    expect(signals.findLogsNeedingSignals).not.toHaveBeenCalled();
  });

  it('should record a failure with an incremented count', async () => {
    // Arrange
    const { service, signals, jev } = setup({
      candidates: [candidate('l1', 1)],
    });
    jev.analyze.mockRejectedValue(new Error('boom'));

    // Act
    const summary = await service.extractPendingSignals();

    // Assert
    expect(summary).toEqual({ extracted: 0, failed: 1, skipped: false });
    expect(signals.saveFailure).toHaveBeenCalledWith(
      expect.objectContaining({ dailyLogId: 'l1' }),
      2,
    );
  });

  it('should respect the batch size across notes', async () => {
    // Arrange
    const { service, signals } = setup({
      candidates: [candidate('l1'), candidate('l2')],
    });

    // Act
    await service.extractPendingSignals(2);

    // Assert
    expect(signals.findLogsNeedingSignals).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ people }),
      2,
    );
  });

  it('should ask the animal bank and pseudonymize nothing of a pet name', async () => {
    // Arrange
    const user = buildUser('u1', true, {
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });
    const { service, jev, signals } = setup({
      user,
      candidates: [
        {
          ...candidate('l1'),
          notes: 'Mochi a griffé le canapé',
          bankVersion: 'animal-v1',
        },
      ],
    });

    // Act
    await service.extractPendingSignals();

    // Assert
    const questions = jev.analyze.mock.calls[0][1] as Record<
      string,
      { instructions: string }
    >;
    expect(jev.analyze.mock.calls[0][0]).toBe('Mochi a griffé le canapé');
    expect(Object.keys(questions)).toContain('aggression');
    expect(Object.keys(questions)).not.toContain('rumination');
    expect(questions.aggression.instructions).toContain('Mochi (le chat)');
    const stored = signals.saveExtraction.mock.calls[0][1];
    expect(stored.markers.firstPersonRatio).toBe(0);
    expect(stored.markers.wordCount).toBe(5);
  });

  it('should never send the name of another tracked person', async () => {
    // Arrange
    const user = buildUser('u1', true, { kind: 'OTHER_PERSON', name: 'Paul' });
    const { service, jev } = setup({
      user,
      candidates: [{ ...candidate('l1'), notes: 'Paul est fatigué' }],
    });

    // Act
    await service.extractPendingSignals();

    // Assert
    expect(jev.analyze.mock.calls[0][0]).toBe(
      '[la personne suivie] est fatigué',
    );
    expect(JSON.stringify(jev.analyze.mock.calls[0][1])).not.toContain('Paul');
  });

  it('should ask one question per custom signal', async () => {
    // Arrange
    const user = buildUser('u1', true, { kind: 'SELF' }, [
      {
        id: 'c1',
        label: 'Litière',
        question: 'Le chat a-t-il uriné hors de sa litière ?',
        kind: 'yes_no',
      },
    ]);
    const { service, jev } = setup({ user, candidates: [candidate('l1')] });

    // Act
    await service.extractPendingSignals();

    // Assert
    expect(jev.analyze.mock.calls[0][1]).toMatchObject({
      custom_c1: {
        type: 'noul',
        instructions: 'Le chat a-t-il uriné hors de sa litière ?',
      },
    });
  });
});
