import { FieldType } from '../enums/field-type.enum.js';
export { FieldType };

export class CustomField {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly fieldType: FieldType,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
