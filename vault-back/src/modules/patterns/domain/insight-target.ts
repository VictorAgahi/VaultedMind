import { FieldType } from '../../health/domain/enums/field-type.enum.js';

export type TargetDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export const TARGET_DIRECTIONS: TargetDirection[] = [
  'HIGHER_IS_BETTER',
  'LOWER_IS_BETTER',
];

export const MAX_INSIGHT_TARGETS = 3;

/** What the user wants to understand: a field and which way is the good one. */
export interface InsightTarget {
  fieldId: string;
  direction: TargetDirection;
}

export interface TargetableField {
  id: string;
  isActive: boolean;
  fieldType: FieldType;
  optionsOrder?: string[];
}

export function isTargetableField(field: TargetableField): boolean {
  if (!field.isActive) return false;
  if (field.fieldType === FieldType.NUMBER) return true;
  if (field.fieldType === FieldType.BOOLEAN) return true;
  return (
    field.fieldType === FieldType.STRING &&
    (field.optionsOrder?.length ?? 0) > 0
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
  if (
    new Set(targets.map((target) => target.fieldId)).size !== targets.length
  ) {
    problems.push('Targets must be distinct');
  }
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  for (const target of targets) {
    const field = fieldById.get(target.fieldId);
    if (!field) {
      problems.push(`Field ${target.fieldId} not found`);
    } else if (!isTargetableField(field)) {
      problems.push(`Field ${target.fieldId} cannot be a target`);
    }
  }
  return problems;
}
