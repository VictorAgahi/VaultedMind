import { jest } from '@jest/globals';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import type { HealthDailyReading } from '../../../../database/repositories/health-daily-metric.repository.js';
import {
  EMPTY_LINKING_STATE,
  type HealthLinkingState,
} from '../../domain/services/health-linking-decisions.js';
import type { LinkingSuggestions } from '../../domain/services/health-linking-schema.js';
import { HealthLinkingAssistantService } from './health-linking-assistant.service.js';
import type { LinkingSuggestionResult } from './health-linking-suggester.service.js';
import type { FieldLinkResult } from './health-field-linker.service.js';

function numberField(
  id: string,
  name: string,
  appleWatchMetric?: AppleWatchMetric,
): CustomField {
  return new CustomField(
    id,
    'user-1',
    name,
    FieldType.NUMBER,
    true,
    new Date(),
    new Date(),
    undefined,
    undefined,
    false,
    undefined,
    undefined,
    appleWatchMetric,
  );
}

function readings(
  metrics: AppleWatchMetric[],
): Map<AppleWatchMetric, HealthDailyReading> {
  return new Map(
    metrics.map((metric) => [
      metric,
      { metric, logDate: '2026-10-31', value: 2 },
    ]),
  );
}

describe('HealthLinkingAssistantService', () => {
  let fields: CustomField[];
  let latest: Map<AppleWatchMetric, HealthDailyReading>;
  let state: HealthLinkingState;
  let suggestions: LinkingSuggestions;
  let saveState: jest.Mock<
    (id: string, state: HealthLinkingState) => Promise<void>
  >;
  let suggest: jest.Mock<() => Promise<LinkingSuggestionResult>>;
  let link: jest.Mock<
    (
      userId: string,
      fieldId: string,
      metric: AppleWatchMetric,
      unit: string | null,
    ) => Promise<FieldLinkResult>
  >;
  let service: HealthLinkingAssistantService;

  beforeEach(() => {
    fields = [numberField('deep', 'Temps de someil profond')];
    latest = readings([AppleWatchMetric.SLEEP_DEEP]);
    state = EMPTY_LINKING_STATE;
    suggestions = new Map();
    saveState = jest
      .fn<(id: string, state: HealthLinkingState) => Promise<void>>()
      .mockResolvedValue(undefined);
    suggest = jest
      .fn<() => Promise<LinkingSuggestionResult>>()
      .mockImplementation(() => Promise.resolve({ suggestions, origin: 'ai' }));
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
          field: numberField(fieldId, 'Temps de someil profond'),
          filledDays: 4,
        }),
      );
    service = new HealthLinkingAssistantService(
      { findByUserId: () => Promise.resolve(fields) } as never,
      { findLatestPerMetric: () => Promise.resolve(latest) } as never,
      {
        findHealthLinkingState: () => Promise.resolve(state),
        saveHealthLinkingState: saveState,
        findUserById: () => Promise.resolve({}),
      } as never,
      { suggest } as never,
      { link } as never,
    );
  });

  function savedState(): HealthLinkingState {
    return saveState.mock.calls[saveState.mock.calls.length - 1][1];
  }

  it('should apply a valid link at the threshold and report it with the filled days', async () => {
    // Arrange
    suggestions = new Map([
      [
        AppleWatchMetric.SLEEP_DEEP,
        {
          action: 'link',
          fieldId: 'deep',
          unit: 'hours',
          confidence: 0.8,
          reason: 'Même donnée',
        },
      ],
    ]);

    // Act
    const result = await service.run('user-1');

    // Assert
    expect(link).toHaveBeenCalledWith(
      'user-1',
      'deep',
      AppleWatchMetric.SLEEP_DEEP,
      'hours',
    );
    expect(result).toEqual({
      autoLinked: [
        {
          metric: AppleWatchMetric.SLEEP_DEEP,
          fieldId: 'deep',
          fieldName: 'Temps de someil profond',
          unit: 'hours',
          filledDays: 4,
        },
      ],
      pendingCount: 0,
    });
    expect(savedState().decisions[AppleWatchMetric.SLEEP_DEEP]).toMatchObject({
      status: 'LINKED',
      fieldId: 'deep',
      auto: true,
    });
  });

  it('should keep a link below the threshold as a proposal', async () => {
    // Arrange
    suggestions = new Map([
      [
        AppleWatchMetric.SLEEP_DEEP,
        {
          action: 'link',
          fieldId: 'deep',
          unit: 'hours',
          confidence: 0.79,
          reason: 'Peut-être',
        },
      ],
    ]);

    // Act
    const result = await service.run('user-1');

    // Assert
    expect(link).not.toHaveBeenCalled();
    expect(result).toEqual({ autoLinked: [], pendingCount: 1 });
    expect(savedState().decisions[AppleWatchMetric.SLEEP_DEEP]).toMatchObject({
      status: 'PENDING_LINK',
      fieldId: 'deep',
      confidence: 0.79,
    });
  });

  it('should never apply an invalid link, whatever its confidence', async () => {
    // Arrange
    fields = [
      numberField('deep', 'Temps de someil profond', AppleWatchMetric.SLEEP),
    ];
    suggestions = new Map([
      [
        AppleWatchMetric.SLEEP_DEEP,
        {
          action: 'link',
          fieldId: 'deep',
          unit: 'hours',
          confidence: 1,
          reason: '',
        },
      ],
    ]);

    // Act
    const result = await service.run('user-1');

    // Assert
    expect(link).not.toHaveBeenCalled();
    expect(result.pendingCount).toBe(1);
    expect(savedState().decisions[AppleWatchMetric.SLEEP_DEEP]).toMatchObject({
      status: 'PENDING_NEW',
      suggestedName: 'Sommeil profond',
    });
  });

  it('should leave a skipped metric aside until a new metric appears', async () => {
    // Arrange
    latest = readings([AppleWatchMetric.ACTIVE_CALORIES]);
    suggestions = new Map([
      [AppleWatchMetric.ACTIVE_CALORIES, { action: 'skip', reason: '' }],
    ]);

    // Act
    await service.run('user-1');
    state = savedState();
    suggest.mockClear();
    await service.run('user-1');
    const unchanged = suggest.mock.calls.length;
    latest = readings([
      AppleWatchMetric.ACTIVE_CALORIES,
      AppleWatchMetric.STEPS,
    ]);
    await service.run('user-1');

    // Assert
    expect(state.skipped).toEqual([AppleWatchMetric.ACTIVE_CALORIES]);
    expect(state.decisions).toEqual({});
    expect(unchanged).toBe(0);
    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('should examine skipped metrics again when forced', async () => {
    // Arrange
    latest = readings([AppleWatchMetric.ACTIVE_CALORIES]);
    state = { decisions: {}, skipped: [AppleWatchMetric.ACTIVE_CALORIES] };

    // Act
    await service.run('user-1', true);

    // Assert
    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('should not run for metrics already linked, ignored or pending', async () => {
    // Arrange
    fields = [numberField('steps', 'Pas', AppleWatchMetric.STEPS)];
    latest = readings([
      AppleWatchMetric.STEPS,
      AppleWatchMetric.SLEEP,
      AppleWatchMetric.BEDTIME,
    ]);
    state = {
      decisions: {
        [AppleWatchMetric.SLEEP]: { status: 'IGNORED', decidedAt: 'x' },
        [AppleWatchMetric.BEDTIME]: { status: 'PENDING_NEW', decidedAt: 'x' },
      },
      skipped: [],
    };

    // Act
    const result = await service.run('user-1');

    // Assert
    expect(suggest).not.toHaveBeenCalled();
    expect(result).toEqual({ autoLinked: [], pendingCount: 1 });
  });
});
