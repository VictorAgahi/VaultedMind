import { FieldType } from '../enums/field-type.enum.js';
import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
export { FieldType, AppleWatchMetric };

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
  ) {}
}
