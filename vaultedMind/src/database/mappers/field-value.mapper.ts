import { FieldValue } from '../../modules/health/domain/entities/field-value.entity.js';
import { FieldValueModel } from '../models/field-value.model.js';

export class FieldValueMapper {
  public static toDomain(model: FieldValueModel): FieldValue {
    return new FieldValue(
      model.id,
      model.dailyLogId,
      model.customFieldId,
      model.value,
      model.createdAt,
      model.updatedAt,
    );
  }

  public static toPersistence(entity: FieldValue): FieldValueModel {
    const model = new FieldValueModel();
    model.id = entity.id;
    model.dailyLogId = entity.dailyLogId;
    model.customFieldId = entity.customFieldId;
    model.value = entity.value;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}
