import { fieldIdOfKey } from './daily-matrix.js';
import {
  isActionablePredictor,
  isNegligibleEffect,
  isNightMetric,
  unitOfLinkedField,
  type LinkedFieldMeasure,
} from './pattern-sources.js';
import type { FindingContext } from './pattern-summaries.js';
import type { PatternFinding, TargetReport } from './pattern-types.js';

/** Fields linked to Apple Health by field id: their unit and the night they describe. */
export type LinkedFieldMeasures = ReadonlyMap<string, LinkedFieldMeasure>;

function measureOfPredictor(
  finding: PatternFinding,
  measures: LinkedFieldMeasures,
): LinkedFieldMeasure | undefined {
  const fieldId = fieldIdOfKey(finding.key);
  return fieldId ? measures.get(fieldId) : undefined;
}

function measureOfTarget(
  target: Pick<TargetReport, 'binary' | 'fieldId'>,
  measures: LinkedFieldMeasures,
): LinkedFieldMeasure | undefined {
  return target.binary ? undefined : measures.get(target.fieldId);
}

/** What a sentence needs to know about the Apple Health fields on both sides of a link. */
export function findingContext(
  finding: PatternFinding,
  target: Pick<TargetReport, 'binary' | 'fieldId'>,
  measures: LinkedFieldMeasures,
): FindingContext {
  const predictor = measureOfPredictor(finding, measures);
  const targetMeasure = measureOfTarget(target, measures);
  return {
    targetUnit: unitOfLinkedField(targetMeasure),
    predictorIsNight: isNightMetric(predictor?.metric),
    targetIsNight: isNightMetric(targetMeasure?.metric),
  };
}

export function isActionableFinding(
  finding: PatternFinding,
  target: Pick<TargetReport, 'binary' | 'fieldId'>,
  measures: LinkedFieldMeasures,
): boolean {
  return isActionablePredictor({
    category: finding.category,
    predictorMetric: measureOfPredictor(finding, measures)?.metric,
    targetMetric: measureOfTarget(target, measures)?.metric,
  });
}

export function isNegligibleFinding(
  finding: PatternFinding,
  target: Pick<TargetReport, 'binary' | 'targetSd'>,
): boolean {
  return isNegligibleEffect(finding.effect, target.targetSd, !!target.binary);
}
