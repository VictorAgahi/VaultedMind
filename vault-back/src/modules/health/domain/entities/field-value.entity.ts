export class FieldValue {
  constructor(
    public readonly id: string,
    public readonly dailyLogId: string,
    public readonly customFieldId: string,
    public readonly value: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
