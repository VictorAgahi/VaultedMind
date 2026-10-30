import { FieldType } from '../enums/field-type.enum.js';
import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
export { FieldType, AppleWatchMetric };

export interface SubFieldDefinition {
  id: string;
  triggerValue: string;
  name: string;
  fieldType: FieldType;
  optionsOrder?: string[];
  placeholder?: string;
  required?: boolean;
}

/**
 * Weekly goal direction: AT_LEAST for habits to build (sport 3x/week),
 * AT_MOST for things to limit (anxiety average, alcohol).
 */
export type GoalDirection = 'AT_LEAST' | 'AT_MOST';

/** Goal fields accept null on update to remove an existing goal. */
export interface CustomFieldGoalUpdate {
  goalTarget?: number | null;
  goalDirection?: GoalDirection | null;
}

export class CustomField {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly fieldType: FieldType,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly optionsOrder?: string[],
    public readonly category?: string,
    public readonly rememberLastValue: boolean = false,
    public readonly min?: number,
    public readonly max?: number,
    public readonly appleWatchMetric?: AppleWatchMetric,
    public readonly subFields?: SubFieldDefinition[],
    public readonly goalTarget?: number,
    public readonly goalDirection?: GoalDirection,
  ) {}
}
