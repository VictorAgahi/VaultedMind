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

/** The construct override accepts null on update to go back to the automatic one. */
export interface CustomFieldConstructOverrideUpdate {
  constructOverride?: string | null;
}

/** The Apple Health metric accepts null on update to unlink the field. */
export interface CustomFieldAppleWatchMetricUpdate {
  appleWatchMetric?: AppleWatchMetric | null;
}

/** Whether the daily-story autofill may propose a value for the field. */
export type AutofillMode = 'AUTO' | 'ON' | 'OFF';
export const AUTOFILL_MODES: AutofillMode[] = ['AUTO', 'ON', 'OFF'];

/** The autofill mode accepts no null: omitting it keeps the stored one. */
export interface CustomFieldAutofillUpdate {
  autofillMode?: AutofillMode;
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
    /** Automatic classification of what the field measures (see signals constructs). */
    public readonly construct?: string,
    /** Keyed hash of the name, category and options the construct was computed from. */
    public readonly constructNameHash?: string,
    /** Construct chosen by the user, which beats the automatic one. */
    public readonly constructOverride?: string,
    public readonly autofillMode: AutofillMode = 'AUTO',
  ) {}
}
