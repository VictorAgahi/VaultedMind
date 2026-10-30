import { FieldType } from '../../health/domain/enums/field-type.enum.js';
import {
  findTargetProblems,
  type InsightTarget,
  isTargetUsable,
  type TargetableField,
} from './insight-target.js';

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

  it.each(['e', 'f', 'missing'])('should reject field %s', (fieldId) => {
    expect(
      findTargetProblems([{ fieldId, direction: 'LOWER_IS_BETTER' }], fields),
    ).toHaveLength(1);
  });

  it('should reject duplicates and more than 6 targets', () => {
    const four = ['a', 'b', 'c', 'a', 'b', 'c', 'a'].map((fieldId) => ({
      fieldId,
      direction: 'HIGHER_IS_BETTER' as const,
    }));
    expect(findTargetProblems(four, fields).length).toBeGreaterThanOrEqual(2);
  });
});

describe('findTargetProblems with values and neutral targets', () => {
  it('should accept 6 targets and the NEUTRAL direction, and reject a 7th', () => {
    // Arrange
    const six: InsightTarget[] = [
      { fieldId: 'a', direction: 'NEUTRAL' },
      { fieldId: 'b', direction: 'NEUTRAL' },
      { fieldId: 'c', direction: 'NEUTRAL' },
      { fieldId: 'd', direction: 'LOWER_IS_BETTER', value: 'agressif' },
      { fieldId: 'd', direction: 'LOWER_IS_BETTER', value: 'calme' },
      { fieldId: 'c', direction: 'HIGHER_IS_BETTER', value: 'x' },
    ];

    // Act / Assert
    expect(findTargetProblems(six, fields)).toEqual([]);
    expect(
      findTargetProblems(
        [...six, { fieldId: 'd', direction: 'NEUTRAL', value: 'autre' }],
        fields,
      ),
    ).toHaveLength(1);
  });

  it('should allow an unordered text field only as a value target', () => {
    expect(
      findTargetProblems([{ fieldId: 'd', direction: 'NEUTRAL' }], fields),
    ).toHaveLength(1);
    expect(
      findTargetProblems(
        [{ fieldId: 'd', direction: 'NEUTRAL', value: 'agressif' }],
        fields,
      ),
    ).toEqual([]);
  });

  it('should let an ordered text field be a scale and a value target at once', () => {
    const targets = [
      { fieldId: 'c', direction: 'HIGHER_IS_BETTER' as const },
      { fieldId: 'c', direction: 'LOWER_IS_BETTER' as const, value: 'x' },
    ];
    expect(findTargetProblems(targets, fields)).toEqual([]);
    expect(findTargetProblems([targets[0], targets[0]], fields)).toContain(
      'Targets must be distinct',
    );
  });

  it('should reject a value on a number field, an empty value and a repeated value', () => {
    expect(
      findTargetProblems(
        [{ fieldId: 'a', direction: 'NEUTRAL', value: 'x' }],
        fields,
      ),
    ).toHaveLength(1);
    expect(
      findTargetProblems(
        [{ fieldId: 'd', direction: 'NEUTRAL', value: '  ' }],
        fields,
      ),
    ).toHaveLength(1);
    expect(
      findTargetProblems(
        [
          { fieldId: 'd', direction: 'NEUTRAL', value: 'x' },
          { fieldId: 'd', direction: 'LOWER_IS_BETTER', value: 'x' },
        ],
        fields,
      ),
    ).toContain('Targets must be distinct');
  });

  it('should tell when a stored target is still usable', () => {
    const scale = { fieldId: 'a', direction: 'NEUTRAL' as const };
    expect(isTargetUsable(scale, fields[0])).toBe(true);
    expect(isTargetUsable(scale, fields[4])).toBe(false);
    expect(isTargetUsable(scale, undefined)).toBe(false);
  });
});
