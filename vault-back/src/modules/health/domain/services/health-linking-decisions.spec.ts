import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  countPendingDecisions,
  EMPTY_LINKING_STATE,
  findLegacyLinkedFields,
  isLinkingStateOutdated,
  LINKING_STATE_VERSION,
  metricsAwaitingDecision,
  reconcileLinkingState,
  shouldRunAssistant,
  withDecision,
  withoutDecision,
  type HealthLinkingState,
} from './health-linking-decisions.js';

const NOW = new Date('2026-10-31T10:00:00Z');
const AT = '2026-10-30T10:00:00.000Z';

describe('health linking decisions', () => {
  it('should wait for a decision only on metrics with data, no field and no decision', () => {
    // Arrange
    const state: HealthLinkingState = {
      decisions: {
        [AppleWatchMetric.STEPS]: { status: 'IGNORED', decidedAt: AT },
        [AppleWatchMetric.SLEEP]: { status: 'LINKED', decidedAt: AT },
      },
      skipped: [],
    };

    // Act
    const awaiting = metricsAwaitingDecision(
      [
        AppleWatchMetric.STEPS,
        AppleWatchMetric.SLEEP,
        AppleWatchMetric.SLEEP_DEEP,
        AppleWatchMetric.BEDTIME,
      ],
      new Set([AppleWatchMetric.BEDTIME]),
      state,
    );

    // Assert (the LINKED sleep has no field any more: it needs a decision again)
    expect(awaiting).toEqual([
      AppleWatchMetric.SLEEP,
      AppleWatchMetric.SLEEP_DEEP,
    ]);
  });

  it('should run after a sync only when a metric was never examined', () => {
    // Arrange
    const state: HealthLinkingState = {
      decisions: {},
      skipped: [AppleWatchMetric.ACTIVE_CALORIES],
    };

    // Act / Assert
    expect(shouldRunAssistant([AppleWatchMetric.ACTIVE_CALORIES], state)).toBe(
      false,
    );
    expect(
      shouldRunAssistant(
        [AppleWatchMetric.ACTIVE_CALORIES, AppleWatchMetric.STEPS],
        state,
      ),
    ).toBe(true);
    expect(shouldRunAssistant([], state)).toBe(false);
  });

  it('should mark as LINKED a pending metric the user linked by hand, and forget stale links', () => {
    // Arrange
    const state: HealthLinkingState = {
      decisions: {
        [AppleWatchMetric.STEPS]: {
          status: 'PENDING_NEW',
          suggestedName: 'Pas',
          decidedAt: AT,
        },
        [AppleWatchMetric.SLEEP]: {
          status: 'LINKED',
          fieldId: 'gone',
          decidedAt: AT,
        },
        [AppleWatchMetric.BEDTIME]: { status: 'IGNORED', decidedAt: AT },
      },
      skipped: [AppleWatchMetric.STEPS],
    };

    // Act
    const reconciled = reconcileLinkingState(
      state,
      new Set([AppleWatchMetric.STEPS]),
      NOW,
    );

    // Assert
    expect(reconciled).toEqual({
      decisions: {
        [AppleWatchMetric.STEPS]: {
          status: 'LINKED',
          decidedAt: NOW.toISOString(),
        },
        [AppleWatchMetric.BEDTIME]: { status: 'IGNORED', decidedAt: AT },
      },
      skipped: [],
    });
  });

  it('should go from pending to ignored and back to no decision', () => {
    // Arrange
    const pending = withDecision(
      { ...EMPTY_LINKING_STATE, skipped: [AppleWatchMetric.STEPS] },
      AppleWatchMetric.STEPS,
      { status: 'PENDING_NEW', decidedAt: AT },
    );

    // Act
    const ignored = withDecision(pending, AppleWatchMetric.STEPS, {
      status: 'IGNORED',
      decidedAt: AT,
    });
    const restored = withoutDecision(ignored, AppleWatchMetric.STEPS);

    // Assert
    expect(pending.skipped).toEqual([]);
    expect(countPendingDecisions(pending)).toBe(1);
    expect(countPendingDecisions(ignored)).toBe(0);
    expect(ignored.decisions[AppleWatchMetric.STEPS]?.status).toBe('IGNORED');
    expect(restored).toEqual(EMPTY_LINKING_STATE);
  });

  describe('legacy links and version', () => {
    const legacy = {
      id: 'legacy',
      category: 'Apple Santé',
      appleWatchMetric: AppleWatchMetric.SLEEP_DEEP,
    };

    it('should tell the fields auto-created by earlier versions from the accepted ones', () => {
      // Arrange
      const accepted = {
        id: 'accepted',
        category: ' Apple Santé ',
        appleWatchMetric: AppleWatchMetric.STEPS,
      };
      const userField = {
        id: 'mine',
        category: 'Corps',
        appleWatchMetric: AppleWatchMetric.SLEEP,
      };
      const unlinked = { id: 'free', category: 'Apple Santé' };
      const state: HealthLinkingState = {
        decisions: {
          [AppleWatchMetric.STEPS]: {
            status: 'LINKED',
            fieldId: 'accepted',
            decidedAt: AT,
          },
        },
        skipped: [],
      };

      // Act
      const found = findLegacyLinkedFields(
        [legacy, accepted, userField, unlinked],
        state,
      );

      // Assert
      expect(found).toEqual([legacy]);
    });

    it('should keep the proposal to replace a legacy link when reconciling', () => {
      // Arrange
      const state: HealthLinkingState = {
        decisions: {
          [AppleWatchMetric.SLEEP_DEEP]: {
            status: 'PENDING_LINK',
            fieldId: 'mine',
            decidedAt: AT,
          },
        },
        skipped: [],
      };
      const linked = new Set([AppleWatchMetric.SLEEP_DEEP]);

      // Act
      const withLegacy = reconcileLinkingState(
        state,
        linked,
        NOW,
        new Set([AppleWatchMetric.SLEEP_DEEP]),
      );
      const withoutLegacy = reconcileLinkingState(state, linked, NOW);

      // Assert
      expect(withLegacy.decisions[AppleWatchMetric.SLEEP_DEEP]?.status).toBe(
        'PENDING_LINK',
      );
      expect(withoutLegacy.decisions[AppleWatchMetric.SLEEP_DEEP]?.status).toBe(
        'LINKED',
      );
    });

    it('should consider a state without or with an older version outdated', () => {
      // Arrange / Act / Assert
      expect(isLinkingStateOutdated(EMPTY_LINKING_STATE)).toBe(true);
      expect(
        isLinkingStateOutdated({ ...EMPTY_LINKING_STATE, version: 1 }),
      ).toBe(true);
      expect(
        isLinkingStateOutdated({
          ...EMPTY_LINKING_STATE,
          version: LINKING_STATE_VERSION,
        }),
      ).toBe(false);
    });

    it('should keep the version through decisions and reconciliation', () => {
      // Arrange
      const state: HealthLinkingState = {
        ...EMPTY_LINKING_STATE,
        version: LINKING_STATE_VERSION,
      };

      // Act
      const decided = withDecision(state, AppleWatchMetric.STEPS, {
        status: 'IGNORED',
        decidedAt: AT,
      });
      const reconciled = reconcileLinkingState(decided, new Set(), NOW);
      const cleared = withoutDecision(reconciled, AppleWatchMetric.STEPS);

      // Assert
      expect(decided.version).toBe(LINKING_STATE_VERSION);
      expect(reconciled.version).toBe(LINKING_STATE_VERSION);
      expect(cleared.version).toBe(LINKING_STATE_VERSION);
    });
  });
});
