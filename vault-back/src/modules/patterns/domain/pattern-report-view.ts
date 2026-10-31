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
  findingContext,
  isActionableFinding,
  isNegligibleFinding,
  type LinkedFieldMeasures,
} from './finding-measures.js';
import {
  readableLabel,
  sourceOfCategory,
  unitOfLinkedField,
  type PatternSource,
} from './pattern-sources.js';
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
    /** Where the predictor comes from, derived from its category at read time. */
    source: PatternSource;
    /** A lever the person can act on, as opposed to a companion that varies along. */
    actionable: boolean;
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

function viewChangePoint(
  changePoint: ChangePointFinding,
  subject?: TrackedSubject,
  unit?: string,
): ChangePointView {
  const relabelled = {
    ...changePoint,
    label: readableLabel(changePoint.key, changePoint.label, subject),
  };
  return { ...relabelled, summary: summarizeChangePoint(relabelled, unit) };
}

/** A change point is told in the unit of its target, unless the unit needs a conversion. */
function changePointUnit(
  target: TargetReport,
  measures: LinkedFieldMeasures,
): string | undefined {
  const unit = unitOfLinkedField(measures.get(target.fieldId));
  return unit && !unit.factor ? unit.label : undefined;
}

function viewFinding(
  finding: PatternFinding,
  target: TargetReport,
  overrides: PatternObviousOverrides,
  subject: TrackedSubject | undefined,
  measures: LinkedFieldMeasures,
): PatternFindingView {
  const findingKey = buildFindingKey(target.key, finding);
  const verdict = resolveObviousness(finding, findingKey, overrides);
  return {
    ...finding,
    label: readableLabel(finding.key, finding.label, subject),
    summary: summarizeFinding(
      finding,
      target.label,
      undefined,
      subject,
      findingContext(finding, target, measures),
    ),
    findingKey,
    obvious: verdict.obvious,
    obviousSource: verdict.source,
    source: sourceOfCategory(finding.category),
    actionable: isActionableFinding(finding, target, measures),
  };
}

function viewTarget(
  target: TargetReport,
  activeTargets: ReadonlySet<string>,
  overrides: PatternObviousOverrides,
  subject: TrackedSubject | undefined,
  measures: LinkedFieldMeasures,
): TargetReportView {
  return {
    ...target,
    targetStillValid: activeTargets.has(
      targetIdentity(target.fieldId, target.value),
    ),
    findings: (target.findings ?? [])
      .filter((finding) => !isNegligibleFinding(finding, target))
      .map((finding) =>
        viewFinding(finding, target, overrides, subject, measures),
      ),
    beforeDifficultDays: target.beforeDifficultDays && {
      difficultDayCount: target.beforeDifficultDays.difficultDayCount,
      items: target.beforeDifficultDays.items.map((original) => {
        const item = {
          ...original,
          label: readableLabel(original.key, original.label, subject),
        };
        return {
          ...item,
          moreFrequentBefore: isMoreFrequentBefore(item),
          summary: summarizeBeforeDifficultItem(item, target, subject),
        };
      }),
    },
    changePoints: (target.changePoints ?? []).map((changePoint) =>
      viewChangePoint(changePoint, subject, changePointUnit(target, measures)),
    ),
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
  measures: LinkedFieldMeasures = new Map(),
): PatternReportView {
  return {
    ...report,
    targets: (report.targets ?? []).map((target) =>
      viewTarget(target, activeTargets, overrides, subject, measures),
    ),
    stateChangePoints: (report.stateChangePoints ?? []).map((changePoint) =>
      viewChangePoint(changePoint, subject),
    ),
  };
}
