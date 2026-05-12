import { AIInsight } from '../../modules/ai-insights/domain/entities/ai-insight.entity.js';
import { AIInsightModel } from '../models/ai-insight.model.js';

export class AIInsightMapper {
  public static toDomain(model: AIInsightModel): AIInsight {
    return new AIInsight(
      model.id,
      model.userId,
      model.type,
      model.title,
      model.content,
      model.metadata || {},
      model.createdAt instanceof Date
        ? model.createdAt
        : new Date(model.createdAt),
      model.updatedAt instanceof Date
        ? model.updatedAt
        : new Date(model.updatedAt),
    );
  }

  public static toPersistence(entity: AIInsight): AIInsightModel {
    const model = new AIInsightModel();
    model.id = entity.id;
    model.userId = entity.userId;
    model.type = entity.type;
    model.title = entity.title;
    model.content = entity.content;
    model.metadata = entity.metadata;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}
