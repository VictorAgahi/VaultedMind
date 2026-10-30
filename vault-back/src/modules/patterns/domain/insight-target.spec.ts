import { FieldType } from '../../health/domain/enums/field-type.enum.js';
import { findTargetProblems, type TargetableField } from './insight-target.js';

const fields: TargetableField[] = [
  { id: 'a', isActive: true, fieldType: FieldType.NUMBER },
  { id: 'b', isActive: true, fieldType: FieldType.BOOLEAN },
  {
    id: 'c',
    isActive: true,
    fieldType: FieldType.STRING,
    optionsOrder: ['x', 'y'],
  },
  { id: 'd', isActive: true, fieldType: FieldType.STRING },
  { id: 'e', isActive: false, fieldType: FieldType.NUMBER },
  { id: 'f', isActive: true, fieldType: FieldType.DATE },
];

describe('findTargetProblems', () => {
  it('should accept number, boolean and ordered string fields', () => {
    expect(
      findTargetProblems(
        ['a', 'b', 'c'].map((fieldId) => ({
          fieldId,
          direction: 'HIGHER_IS_BETTER' as const,
        })),
        fields,
      ),
    ).toEqual([]);
  });

  it.each(['d', 'e', 'f', 'missing'])('should reject field %s', (fieldId) => {
    expect(
      findTargetProblems([{ fieldId, direction: 'LOWER_IS_BETTER' }], fields),
    ).toHaveLength(1);
  });

  it('should reject duplicates and more than 3 targets', () => {
    const four = ['a', 'b', 'c', 'a'].map((fieldId) => ({
      fieldId,
      direction: 'HIGHER_IS_BETTER' as const,
    }));
    expect(findTargetProblems(four, fields).length).toBeGreaterThanOrEqual(2);
  });
});
