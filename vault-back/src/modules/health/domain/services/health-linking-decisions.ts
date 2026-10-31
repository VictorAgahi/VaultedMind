import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import type { HealthMetricRelevance } from './health-metric-catalog.js';
import type { HealthFieldUnit } from './health-metric-units.js';

/**
 * What the user (or the assistant) decided for a metric that has data:
 * - LINKED: the metric feeds a field
 * - IGNORED: the user does not want it
 * - PENDING_LINK: an existing field is proposed, waiting for the user
 * - PENDING_NEW: a new field is proposed, waiting for the user
 */
export type HealthMetricDecisionStatus =
  | 'LINKED'
  | 'IGNORED'
  | 'PENDING_LINK'
  | 'PENDING_NEW';

export interface HealthMetricDecision {
  status: HealthMetricDecisionStatus;
  fieldId?: string;
  unit?: HealthFieldUnit | null;
  suggestedName?: string;
  relevance?: HealthMetricRelevance;
  confidence?: number;
  reason?: string;
  /** The link was applied by the assistant without asking. */
  auto?: boolean;
  /** ISO instant of the decision. */
  decidedAt: string;
}

export interface HealthLinkingState {
  decisions: Partial<Record<AppleWatchMetric, HealthMetricDecision>>;
  /** Metrics the assistant chose to leave aside: examined again only with new metrics. */
  skipped: AppleWatchMetric[];
}

export const EMPTY_LINKING_STATE: HealthLinkingState = {
  decisions: {},
  skipped: [],
};

/** A link proposed with at least this confidence is applied without asking. */
export const AUTO_LINK_CONFIDENCE = 0.8;

const PENDING_STATUSES: HealthMetricDecisionStatus[] = [
  'PENDING_LINK',
  'PENDING_NEW',
];

export function isPendingDecision(decision?: HealthMetricDecision): boolean {
  return !!decision && PENDING_STATUSES.includes(decision.status);
}

/**
 * Metrics with data that still need a decision: no linked field and no decision. A LINKED
 * decision whose field was unlinked or deleted since does not count any more.
 */
export function metricsAwaitingDecision(
  metricsWithData: AppleWatchMetric[],
  linkedMetrics: ReadonlySet<AppleWatchMetric>,
  state: HealthLinkingState,
): AppleWatchMetric[] {
  return metricsWithData.filter((metric) => {
    if (linkedMetrics.has(metric)) return false;
    const decision = state.decisions[metric];
    return !decision || decision.status === 'LINKED';
  });
}

/** The assistant runs after a sync only when a metric it never examined has data. */
export function shouldRunAssistant(
  awaiting: AppleWatchMetric[],
  state: HealthLinkingState,
): boolean {
  return awaiting.some((metric) => !state.skipped.includes(metric));
}

/**
 * Brings the state in line with the fields: a metric linked meanwhile (by the user, from the
 * mapping section) is LINKED, a LINKED metric whose field is gone needs a decision again.
 */
export function reconcileLinkingState(
  state: HealthLinkingState,
  linkedMetrics: ReadonlySet<AppleWatchMetric>,
  now: Date,
): HealthLinkingState {
  const decisions: HealthLinkingState['decisions'] = {};
  for (const [metric, decision] of Object.entries(state.decisions) as Array<
    [AppleWatchMetric, HealthMetricDecision]
  >) {
    if (linkedMetrics.has(metric)) {
      decisions[metric] =
        decision.status === 'LINKED'
          ? decision
          : { status: 'LINKED', decidedAt: now.toISOString() };
    } else if (decision.status !== 'LINKED') {
      decisions[metric] = decision;
    }
  }
  return {
    decisions,
    skipped: state.skipped.filter((metric) => !linkedMetrics.has(metric)),
  };
}

export function withDecision(
  state: HealthLinkingState,
  metric: AppleWatchMetric,
  decision: HealthMetricDecision,
): HealthLinkingState {
  return {
    decisions: { ...state.decisions, [metric]: decision },
    skipped: state.skipped.filter((skipped) => skipped !== metric),
  };
}

export function withoutDecision(
  state: HealthLinkingState,
  metric: AppleWatchMetric,
): HealthLinkingState {
  const decisions = { ...state.decisions };
  delete decisions[metric];
  return {
    decisions,
    skipped: state.skipped.filter((skipped) => skipped !== metric),
  };
}

export function countPendingDecisions(state: HealthLinkingState): number {
  return Object.values(state.decisions).filter((decision) =>
    isPendingDecision(decision),
  ).length;
}
