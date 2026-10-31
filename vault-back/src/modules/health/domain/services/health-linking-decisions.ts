import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import { APPLE_HEALTH_CATEGORY } from './health-metric-catalog.js';
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
  /** Version of the assistant that last examined the user's metrics; absent before 2. */
  version?: number;
}

export const EMPTY_LINKING_STATE: HealthLinkingState = {
  decisions: {},
  skipped: [],
};

/**
 * Raised each time the assistant must examine every user once more at the next sync (2:
 * links to the fields created by earlier versions are re-examined).
 */
export const LINKING_STATE_VERSION = 2;

export function isLinkingStateOutdated(state: HealthLinkingState): boolean {
  return (state.version ?? 0) < LINKING_STATE_VERSION;
}

/** A field as the detection of the legacy links needs it. */
export interface LegacyCandidateField {
  id: string;
  category?: string | null;
  appleWatchMetric?: AppleWatchMetric | null;
}

/**
 * Fields created automatically by earlier versions: in the "Apple Santé" category, linked to
 * a metric and not the field a LINKED decision recorded (accepted or created by the user).
 */
export function findLegacyLinkedFields<T extends LegacyCandidateField>(
  fields: T[],
  state: HealthLinkingState,
): T[] {
  return fields.filter(
    (field) =>
      field.category?.trim() === APPLE_HEALTH_CATEGORY &&
      !!field.appleWatchMetric &&
      state.decisions[field.appleWatchMetric]?.fieldId !== field.id,
  );
}

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
  legacyMetrics: ReadonlySet<AppleWatchMetric> = new Set(),
): HealthLinkingState {
  const decisions: HealthLinkingState['decisions'] = {};
  for (const [metric, decision] of Object.entries(state.decisions) as Array<
    [AppleWatchMetric, HealthMetricDecision]
  >) {
    if (linkedMetrics.has(metric)) {
      // A proposal to replace the link to a legacy field stays a proposal
      const keep =
        decision.status === 'LINKED' ||
        (legacyMetrics.has(metric) && decision.status === 'PENDING_LINK');
      decisions[metric] = keep
        ? decision
        : { status: 'LINKED', decidedAt: now.toISOString() };
    } else if (decision.status !== 'LINKED') {
      decisions[metric] = decision;
    }
  }
  return {
    ...state,
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
    ...state,
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
    ...state,
    decisions,
    skipped: state.skipped.filter((skipped) => skipped !== metric),
  };
}

export function countPendingDecisions(state: HealthLinkingState): number {
  return Object.values(state.decisions).filter((decision) =>
    isPendingDecision(decision),
  ).length;
}
