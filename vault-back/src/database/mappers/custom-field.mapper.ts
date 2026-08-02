import { CustomField } from '../../modules/health/domain/entities/custom-field.entity.js';
import { CustomFieldModel } from '../models/custom-field.model.js';

export class CustomFieldMapper {
  public static toDomain(model: CustomFieldModel): CustomField {
    return new CustomField(
      model.id,
      model.userId,
      model.name,
      model.fieldType,
      model.isActive,
      model.createdAt,
      model.updatedAt,
      model.optionsOrder,
      model.category,
      model.rememberLastValue,
      model.min,
      model.max,
    );
  }

  public static toPersistence(entity: CustomField): CustomFieldModel {
    const model = new CustomFieldModel();
    model.id = entity.id;
    model.userId = entity.userId;
    model.name = entity.name;
    model.fieldType = entity.fieldType;
    model.isActive = entity.isActive;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    model.optionsOrder = entity.optionsOrder;
    model.category = entity.category;
    model.rememberLastValue = entity.rememberLastValue;
    model.min = entity.min;
    model.max = entity.max;
    return model;
  }
}
