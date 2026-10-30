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

export type PatternFindingView = PatternFinding & Summarized;
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

function viewTarget(
  target: TargetReport,
  activeTargetFieldIds: ReadonlySet<string>,
): TargetReportView {
  return {
    ...target,
    targetStillValid: activeTargetFieldIds.has(target.fieldId),
    findings: target.findings.map((finding) => ({
      ...finding,
      summary: summarizeFinding(finding, target.label),
    })),
    beforeDifficultDays: target.beforeDifficultDays && {
      difficultDayCount: target.beforeDifficultDays.difficultDayCount,
      items: target.beforeDifficultDays.items.map((item) => ({
        ...item,
        moreFrequentBefore: isMoreFrequentBefore(item),
        summary: summarizeBeforeDifficultItem(item),
      })),
    },
    changePoints: target.changePoints.map(viewChangePoint),
    scoreTextGaps: target.scoreTextGaps.map((gap) => ({
      ...gap,
      summary: summarizeScoreTextGap(gap),
    })),
  };
}

/** Adds the French sentences at read time so the wording can evolve without recomputing. */
export function buildPatternReportView(
  report: PatternReport,
  activeTargetFieldIds: ReadonlySet<string>,
): PatternReportView {
  return {
    ...report,
    targets: report.targets.map((target) =>
      viewTarget(target, activeTargetFieldIds),
    ),
    stateChangePoints: report.stateChangePoints.map(viewChangePoint),
  };
}
