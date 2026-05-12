import { InsightType } from '../enums/insight-type.enum.js';

export class AIInsight {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: InsightType,
    public readonly title: string,
    public readonly content: string,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
