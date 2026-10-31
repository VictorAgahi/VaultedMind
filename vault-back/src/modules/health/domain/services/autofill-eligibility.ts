import { FieldType } from '../enums/field-type.enum.js';
import type { AutofillMode } from '../entities/custom-field.entity.js';
import {
  effectiveConstruct,
  type Construct,
  type ConstructFieldSource,
} from '../../../signals/domain/constructs.js';
import type { TrackedSubjectKind } from '../../../signals/domain/tracked-subject.js';

/**
 * Constructs that are measurable facts the author states outright (hours slept, coffees, minutes
 * of sport). Everything subjective (mood, anxiety, fatigue...) is deliberately absent: the agent
 * never proposes a value for those in automatic mode.
 */
export const FACTUAL_CONSTRUCTS: readonly Construct[] = [
  'sleep',
  'physical_activity',
  'substances',
  'screens',
  'outdoors',
  'appetite',
];

/** Observed behaviours and events of a tracked animal, factual as well. */
export const ANIMAL_FACTUAL_CONSTRUCTS: readonly Construct[] = [
  'aggression',
  'elimination',
  'play',
  'vet',
  'environment_change',
];

export interface AutofillField extends ConstructFieldSource {
  id: string;
  isActive: boolean;
  fieldType: FieldType;
  autofillMode: AutofillMode;
}

export interface AutofillContext {
  subjectKind: TrackedSubjectKind;
  /** Ids of the fields the user wants to understand: they must stay self-rated. */
  insightTargetFieldIds: ReadonlySet<string>;
}

/** The part of a user's preferences the eligibility rule depends on. */
export interface AutofillPreferences {
  trackedSubject: { kind: TrackedSubjectKind };
  insightTargets: ReadonlyArray<{ fieldId: string }>;
}

export function buildAutofillContext(
  preferences: AutofillPreferences,
): AutofillContext {
  return {
    subjectKind: preferences.trackedSubject.kind,
    insightTargetFieldIds: new Set(
      preferences.insightTargets.map((target) => target.fieldId),
    ),
  };
}

function isFactualConstruct(
  construct: Construct,
  subjectKind: TrackedSubjectKind,
): boolean {
  if (FACTUAL_CONSTRUCTS.includes(construct)) return true;
  return (
    subjectKind === 'ANIMAL' && ANIMAL_FACTUAL_CONSTRUCTS.includes(construct)
  );
}

/**
 * Whether the story of the day may pre-fill the field.
 * Never for inactive, Apple Watch, insight target, date or OFF fields; always for ON fields;
 * for AUTO fields only when the construct is factual.
 */
export function isAutofillEligible(
  field: AutofillField,
  context: AutofillContext,
): boolean {
  if (!field.isActive) return false;
  if (field.appleWatchMetric) return false;
  if (context.insightTargetFieldIds.has(field.id)) return false;
  if (field.fieldType === FieldType.DATE) return false;
  if (field.autofillMode === 'OFF') return false;
  if (field.autofillMode === 'ON') return true;
  return isFactualConstruct(effectiveConstruct(field), context.subjectKind);
}
