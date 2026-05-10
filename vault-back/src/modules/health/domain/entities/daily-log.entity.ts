import { FieldValue } from './field-value.entity.js';

export class DailyLog {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly logDate: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly notes?: string,
    public readonly fieldValues?: FieldValue[],
  ) {}
}
