import { DailyLog } from '../../modules/health/domain/entities/daily-log.entity.js';
import { DailyLogModel } from '../models/daily-log.model.js';
import { FieldValueMapper } from './field-value.mapper.js';

export class DailyLogMapper {
  public static toDomain(model: DailyLogModel): DailyLog {
    return new DailyLog(
      model.id,
      model.userId,
      model.logDate instanceof Date ? model.logDate : new Date(model.logDate),
      model.createdAt instanceof Date
        ? model.createdAt
        : new Date(model.createdAt),
      model.updatedAt instanceof Date
        ? model.updatedAt
        : new Date(model.updatedAt),
      model.notes,
      model.fieldValues
        ? model.fieldValues.map((fv) => FieldValueMapper.toDomain(fv))
        : undefined,
    );
  }

  public static toPersistence(entity: DailyLog): DailyLogModel {
    const model = new DailyLogModel();
    model.id = entity.id;
    model.userId = entity.userId;
    model.logDate = entity.logDate;
    model.notes = entity.notes;
    model.createdAt = entity.createdAt;
    model.updatedAt = entity.updatedAt;
    return model;
  }
}
