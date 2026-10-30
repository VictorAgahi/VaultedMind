import { FieldType } from '../../health/domain/enums/field-type.enum.js';

/** NEUTRAL: the user only wants to understand what makes the target vary, with no good side. */
export type TargetDirection =
  | 'HIGHER_IS_BETTER'
  | 'LOWER_IS_BETTER'
  | 'NEUTRAL';

export const TARGET_DIRECTIONS: TargetDirection[] = [
  'HIGHER_IS_BETTER',
  'LOWER_IS_BETTER',
  'NEUTRAL',
];

export const MAX_INSIGHT_TARGETS = 6;
export const MAX_TARGET_VALUE_LENGTH = 100;

/**
 * What the user wants to understand: a field and which way is the good one.
 * With a value, the target is binary: 1 on the days the text field equals the value.
 */
export interface InsightTarget {
  fieldId: string;
  direction: TargetDirection;
  value?: string;
}

export interface TargetableField {
  id: string;
  isActive: boolean;
  fieldType: FieldType;
  optionsOrder?: string[];
}

export function isValueTarget<T extends { value?: string | null }>(
  target: T,
): target is T & { value: string } {
  return typeof target.value === 'string' && target.value !== '';
}

/** Identity of a target: the same field may be targeted several times with different values. */
export function targetIdentity(fieldId: string, value?: string | null): string {
  return value ? `${fieldId}=${value}` : fieldId;
}

function isOrderedString(field: TargetableField): boolean {
  return (
    field.fieldType === FieldType.STRING &&
    (field.optionsOrder?.length ?? 0) > 0
  );
}

/** Whether the field can be a target, with no value (a scale). */
export function isScaleTargetableField(field: TargetableField): boolean {
  if (!field.isActive) return false;
  if (field.fieldType === FieldType.NUMBER) return true;
  if (field.fieldType === FieldType.BOOLEAN) return true;
  return isOrderedString(field);
}

/** Whether the field can be a target at all: a scale, or a value of a text field. */
export function isTargetableField(field: TargetableField): boolean {
  return (
    field.isActive &&
    (isScaleTargetableField(field) || field.fieldType === FieldType.STRING)
  );
}

function findTargetProblem(
  target: InsightTarget,
  field: TargetableField | undefined,
): string | null {
  if (!field) return `Field ${target.fieldId} not found`;
  if (!isTargetableField(field)) {
    return `Field ${target.fieldId} cannot be a target`;
  }
  if (target.value === undefined || target.value === null) {
    return isScaleTargetableField(field)
      ? null
      : `Field ${target.fieldId} needs a value to be a target`;
  }
  if (field.fieldType !== FieldType.STRING) {
    return `Field ${target.fieldId} cannot have a target value`;
  }
  if (target.value.trim() === '') {
    return `Field ${target.fieldId} has an empty target value`;
  }
  return null;
}

/** Whether a stored target can still be analysed with the field as it is now. */
export function isTargetUsable(
  target: InsightTarget,
  field: TargetableField | undefined,
): boolean {
  return (
    field !== undefined &&
    field.isActive &&
    findTargetProblem(target, field) === null
  );
}

/** Reasons why a set of targets cannot be saved; empty when it is valid. */
export function findTargetProblems(
  targets: InsightTarget[],
  fields: TargetableField[],
): string[] {
  const problems: string[] = [];
  if (targets.length > MAX_INSIGHT_TARGETS) {
    problems.push(`At most ${MAX_INSIGHT_TARGETS} targets are allowed`);
  }
  const identities = targets.map((target) =>
    targetIdentity(target.fieldId, target.value),
  );
  if (new Set(identities).size !== targets.length) {
    problems.push('Targets must be distinct');
  }
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  for (const target of targets) {
    const problem = findTargetProblem(target, fieldById.get(target.fieldId));
    if (problem) problems.push(problem);
  }
  return problems;
}
