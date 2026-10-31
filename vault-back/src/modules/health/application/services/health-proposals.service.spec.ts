import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import type { HealthLinkingState } from '../../domain/services/health-linking-decisions.js';
import type { HealthDailyReading } from '../../../../database/repositories/health-daily-metric.repository.js';
import { HealthProposalsService } from './health-proposals.service.js';
import type { FieldLinkResult } from './health-field-linker.service.js';

const AT = '2026-10-31T08:00:00.000Z';

function numberField(
  id: string,
  name: string,
  options: {
    metric?: AppleWatchMetric;
    category?: string;
    hourly?: boolean;
  } = {},
): CustomField {
  return new CustomField(
    id,
    'user-1',
    name,
    FieldType.NUMBER,
    true,
    new Date(),
    new Date(),
    options.hourly ? ['isHourly'] : undefined,
    options.category,
    false,
    undefined,
    undefined,
    options.metric,
  );
}

describe('HealthProposalsService', () => {
  let fields: CustomField[];
  let state: HealthLinkingState;
  let saveState: jest.Mock<
    (id: string, state: HealthLinkingState) => Promise<void>
  >;
  let saveDomain: jest.Mock<(field: CustomField) => Promise<CustomField>>;
  let link: jest.Mock<
    (
      userId: string,
      fieldId: string,
      metric: AppleWatchMetric,
      unit: string | null,
    ) => Promise<FieldLinkResult>
  >;
  let run: jest.Mock<() => Promise<{ autoLinked: []; pendingCount: number }>>;
  let service: HealthProposalsService;

  beforeEach(() => {
    fields = [];
    state = { decisions: {}, skipped: [] };
    saveState = jest
      .fn<(id: string, state: HealthLinkingState) => Promise<void>>()
      .mockResolvedValue(undefined);
    saveDomain = jest
      .fn<(field: CustomField) => Promise<CustomField>>()
      .mockImplementation((field) => Promise.resolve(field));
    link = jest
      .fn<
        (
          userId: string,
          fieldId: string,
          metric: AppleWatchMetric,
          unit: string | null,
        ) => Promise<FieldLinkResult>
      >()
      .mockImplementation((_userId, fieldId) =>
        Promise.resolve({
          field:
            fields.find((field) => field.id === fieldId) ??
            saveDomain.mock.calls[0]?.[0],
          filledDays: 5,
        }),
      );
    run = jest
      .fn<() => Promise<{ autoLinked: []; pendingCount: number }>>()
      .mockResolvedValue({ autoLinked: [], pendingCount: 1 });
    const latest = new Map<AppleWatchMetric, HealthDailyReading>([
      [
        AppleWatchMetric.RESTING_HEART_RATE,
        {
          metric: AppleWatchMetric.RESTING_HEART_RATE,
          logDate: '2026-10-31',
          value: 58,
        },
      ],
    ]);
    service = new HealthProposalsService(
      { findByUserId: () => Promise.resolve(fields), saveDomain } as never,
      { findLatestPerMetric: () => Promise.resolve(latest) } as never,
      {
        findHealthLinkingState: () => Promise.resolve(state),
        saveHealthLinkingState: saveState,
      } as never,
      { link } as never,
      { run } as never,
    );
  });

  function savedState(): HealthLinkingState {
    return saveState.mock.calls[saveState.mock.calls.length - 1][1];
  }

  it('should list pending proposals with their example and the legacy fields to clean', async () => {
    // Arrange
    fields = [
      numberField('old', 'Pas', {
        metric: AppleWatchMetric.STEPS,
        category: 'Apple Santé',
      }),
      numberField('mine', 'Sommeil', {
        metric: AppleWatchMetric.SLEEP,
        category: 'Apple Santé',
      }),
      numberField('deleted-later', 'Repos'),
    ];
    state = {
      decisions: {
        [AppleWatchMetric.RESTING_HEART_RATE]: {
          status: 'PENDING_NEW',
          suggestedName: 'FC au repos',
          relevance: 'high',
          decidedAt: AT,
        },
        [AppleWatchMetric.SLEEP]: {
          status: 'LINKED',
          fieldId: 'mine',
          auto: true,
          decidedAt: AT,
        },
        [AppleWatchMetric.ACTIVE_CALORIES]: {
          status: 'IGNORED',
          decidedAt: AT,
        },
        [AppleWatchMetric.SLEEP_DEEP]: {
          status: 'PENDING_LINK',
          fieldId: 'gone',
          decidedAt: AT,
        },
      },
      skipped: [],
    };

    // Act
    const view = await service.list('user-1');

    // Assert
    expect(view.proposals).toEqual([
      expect.objectContaining({
        metric: AppleWatchMetric.RESTING_HEART_RATE,
        label: 'Fréquence cardiaque au repos',
        unitLabel: 'bpm',
        exampleValue: 58,
        status: 'PENDING_NEW',
        suggestedName: 'FC au repos',
      }),
      expect.objectContaining({
        metric: AppleWatchMetric.SLEEP_DEEP,
        status: 'PENDING_NEW',
        suggestedName: 'Sommeil profond',
        fieldId: null,
      }),
    ]);
    expect(view.ignored).toEqual([
      { metric: AppleWatchMetric.ACTIVE_CALORIES, label: 'Calories actives' },
    ]);
    expect(view.autoLinked).toEqual([
      expect.objectContaining({
        metric: AppleWatchMetric.SLEEP,
        fieldName: 'Sommeil',
      }),
    ]);
    expect(view.legacyFields).toEqual([
      { id: 'old', name: 'Pas', metric: AppleWatchMetric.STEPS },
    ]);
  });

  it('should create the proposed field and report the past days filled', async () => {
    // Arrange
    state = {
      decisions: {
        [AppleWatchMetric.RESTING_HEART_RATE]: {
          status: 'PENDING_NEW',
          suggestedName: 'FC au repos',
          decidedAt: AT,
        },
      },
      skipped: [],
    };

    // Act
    const result = await service.accept(
      'user-1',
      AppleWatchMetric.RESTING_HEART_RATE,
      { create: { name: 'Pouls au repos' } },
    );

    // Assert
    const created = saveDomain.mock.calls[0][0];
    expect(created).toMatchObject({
      name: 'Pouls au repos',
      fieldType: FieldType.NUMBER,
      category: 'Apple Santé',
      max: 250,
    });
    expect(link).toHaveBeenCalledWith(
      'user-1',
      created.id,
      AppleWatchMetric.RESTING_HEART_RATE,
      null,
    );
    expect(result).toMatchObject({ created: true, filledDays: 5 });
    expect(
      savedState().decisions[AppleWatchMetric.RESTING_HEART_RATE],
    ).toMatchObject({ status: 'LINKED', fieldId: created.id, auto: false });
  });

  it('should link another field chosen by the user, with the unit the user chose', async () => {
    // Arrange
    fields = [numberField('rest', 'Repos')];
    state = {
      decisions: {
        [AppleWatchMetric.SLEEP]: { status: 'PENDING_NEW', decidedAt: AT },
      },
      skipped: [],
    };

    // Act
    const result = await service.accept('user-1', AppleWatchMetric.SLEEP, {
      fieldId: 'rest',
      unit: 'minutes',
    });

    // Assert
    expect(link).toHaveBeenCalledWith(
      'user-1',
      'rest',
      AppleWatchMetric.SLEEP,
      'minutes',
    );
    expect(result).toMatchObject({ created: false, unit: 'minutes' });
  });

  it('should refuse a field that does not suit the metric', async () => {
    // Arrange
    fields = [numberField('clock', 'Réveil', { hourly: true })];

    // Act
    const attempt = service.accept('user-1', AppleWatchMetric.SLEEP, {
      fieldId: 'clock',
    });

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    expect(link).not.toHaveBeenCalled();
  });

  it('should ignore a metric, then examine it again once no longer ignored', async () => {
    // Arrange / Act
    await service.ignore('user-1', AppleWatchMetric.STEPS);
    state = savedState();
    await service.unignore('user-1', AppleWatchMetric.STEPS);

    // Assert
    expect(state.decisions[AppleWatchMetric.STEPS]?.status).toBe('IGNORED');
    expect(savedState().decisions[AppleWatchMetric.STEPS]).toBeUndefined();
    expect(run).toHaveBeenCalledWith('user-1');
  });

  it('should list the proposal to replace a legacy link and keep the legacy field to clean', async () => {
    // Arrange
    fields = [
      numberField('legacy', 'Fréquence au repos', {
        metric: AppleWatchMetric.RESTING_HEART_RATE,
        category: 'Apple Santé',
      }),
      numberField('mine', 'FC repos'),
    ];
    state = {
      decisions: {
        [AppleWatchMetric.RESTING_HEART_RATE]: {
          status: 'PENDING_LINK',
          fieldId: 'mine',
          unit: null,
          confidence: 0.7,
          decidedAt: AT,
        },
      },
      skipped: [],
    };

    // Act
    const view = await service.list('user-1');

    // Assert
    expect(view.proposals).toHaveLength(1);
    expect(view.proposals[0]).toMatchObject({
      metric: AppleWatchMetric.RESTING_HEART_RATE,
      status: 'PENDING_LINK',
      fieldId: 'mine',
    });
    expect(view.legacyFields).toEqual([
      {
        id: 'legacy',
        name: 'Fréquence au repos',
        metric: AppleWatchMetric.RESTING_HEART_RATE,
      },
    ]);
  });
});
