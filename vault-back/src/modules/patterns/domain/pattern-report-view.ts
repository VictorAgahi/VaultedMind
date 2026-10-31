import type { TrackedSubject } from '../../signals/domain/tracked-subject.js';
import { targetIdentity } from './insight-target.js';
import {
  buildFindingKey,
  resolveObviousness,
  type ObviousSource,
  type PatternObviousOverrides,
} from './pattern-obviousness.js';
import type {
  BeforeDifficultDaysItem,
  ChangePointFinding,
  PatternFinding,
  PatternReport,
  ScoreTextGap,
  TargetReport,
} from './pattern-types.js';
import {
  isMoreFrequentBefore,
  summarizeBeforeDifficultItem,
  summarizeChangePoint,
  summarizeFinding,
  summarizeScoreTextGap,
} from './pattern-summaries.js';

export interface Summarized {
  summary: string;
}

export type PatternFindingView = PatternFinding &
  Summarized & {
    /** Stable identity of the link, sent back to record the user's verdict. */
    findingKey: string;
    obvious: boolean;
    obviousSource: ObviousSource | null;
  };
export type BeforeDifficultDaysItemView = BeforeDifficultDaysItem &
  Summarized & { moreFrequentBefore: boolean };
export type ChangePointView = ChangePointFinding & Summarized;
export type ScoreTextGapView = ScoreTextGap & Summarized;

export interface TargetReportView extends Omit<
  TargetReport,
  'findings' | 'beforeDifficultDays' | 'changePoints' | 'scoreTextGaps'
> {
  /** False when the field was deactivated or deleted since the computation. */
  targetStillValid: boolean;
  findings: PatternFindingView[];
  beforeDifficultDays: {
    difficultDayCount: number;
    items: BeforeDifficultDaysItemView[];
  } | null;
  changePoints: ChangePointView[];
  scoreTextGaps: ScoreTextGapView[];
}

export interface PatternReportView extends Omit<
  PatternReport,
  'targets' | 'stateChangePoints'
> {
  targets: TargetReportView[];
  stateChangePoints: ChangePointView[];
}

function viewChangePoint(changePoint: ChangePointFinding): ChangePointView {
  return { ...changePoint, summary: summarizeChangePoint(changePoint) };
}

function viewFinding(
  finding: PatternFinding,
  target: TargetReport,
  overrides: PatternObviousOverrides,
): PatternFindingView {
  const findingKey = buildFindingKey(target.key, finding);
  const verdict = resolveObviousness(finding, findingKey, overrides);
  return {
    ...finding,
    summary: summarizeFinding(finding, target.label),
    findingKey,
    obvious: verdict.obvious,
    obviousSource: verdict.source,
  };
}

function viewTarget(
  target: TargetReport,
  activeTargets: ReadonlySet<string>,
  overrides: PatternObviousOverrides,
  subject?: TrackedSubject,
): TargetReportView {
  return {
    ...target,
    targetStillValid: activeTargets.has(
      targetIdentity(target.fieldId, target.value),
    ),
    findings: (target.findings ?? []).map((finding) =>
      viewFinding(finding, target, overrides),
    ),
    beforeDifficultDays: target.beforeDifficultDays && {
      difficultDayCount: target.beforeDifficultDays.difficultDayCount,
      items: target.beforeDifficultDays.items.map((item) => ({
        ...item,
        moreFrequentBefore: isMoreFrequentBefore(item),
        summary: summarizeBeforeDifficultItem(item, target, subject),
      })),
    },
    changePoints: (target.changePoints ?? []).map(viewChangePoint),
    scoreTextGaps: (target.scoreTextGaps ?? []).map((gap) => ({
      ...gap,
      summary: summarizeScoreTextGap(gap, subject),
    })),
  };
}

/** Adds the French sentences at read time so the wording can evolve without recomputing. */
export function buildPatternReportView(
  report: PatternReport,
  activeTargets: ReadonlySet<string>,
  overrides: PatternObviousOverrides = {},
  subject?: TrackedSubject,
): PatternReportView {
  return {
    ...report,
    targets: (report.targets ?? []).map((target) =>
      viewTarget(target, activeTargets, overrides, subject),
    ),
    stateChangePoints: (report.stateChangePoints ?? []).map(viewChangePoint),
  };
}
