import { FieldType } from '../enums/field-type.enum.js';
import {
  autofillPropertyName,
  buildAutofillSchema,
  type AutofillSchemaField,
} from './autofill-schema.js';

const numberField: AutofillSchemaField = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Sommeil (h)',
  fieldType: FieldType.NUMBER,
  min: 0,
  max: 24,
};
const booleanField: AutofillSchemaField = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Sport',
  fieldType: FieldType.BOOLEAN,
};
const optionsField: AutofillSchemaField = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Repas',
  fieldType: FieldType.STRING,
  optionsOrder: ['Léger', 'Normal', 'Copieux'],
};
const freeField: AutofillSchemaField = {
  id: '44444444-4444-4444-4444-444444444444',
  name: 'Activité',
  fieldType: FieldType.STRING,
};

describe('buildAutofillSchema', () => {
  const schema = buildAutofillSchema([
    numberField,
    booleanField,
    optionsField,
    freeField,
  ]);

  it('should be strict: every property required, nothing else allowed', () => {
    // Assert
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
    for (const property of Object.values(schema.properties)) {
      expect(property.additionalProperties).toBe(false);
      expect(property.required).toEqual(['value', 'quote']);
    }
  });

  it('should type a NUMBER field as number or null with its range in the description', () => {
    // Act
    const property = schema.properties[autofillPropertyName(numberField.id)];

    // Assert
    const valueSchema = property.properties.value.anyOf[0];
    expect(valueSchema.type).toBe('number');
    expect(valueSchema.description).toContain('minimum 0, maximum 24');
    expect(property.properties.value.anyOf[1]).toEqual({ type: 'null' });
  });

  it('should type a BOOLEAN field as boolean or null', () => {
    // Act
    const property = schema.properties[autofillPropertyName(booleanField.id)];

    // Assert
    expect(property.properties.value.anyOf[0]).toMatchObject({
      type: 'boolean',
    });
  });

  it('should restrict a STRING field with options to an enum', () => {
    // Act
    const property = schema.properties[autofillPropertyName(optionsField.id)];

    // Assert
    expect(property.properties.value.anyOf[0]).toMatchObject({
      type: 'string',
      enum: ['Léger', 'Normal', 'Copieux'],
    });
  });

  it('should keep a free STRING field short and name the field in the description', () => {
    // Act
    const property = schema.properties[autofillPropertyName(freeField.id)];

    // Assert
    const valueSchema = property.properties.value.anyOf[0];
    expect(valueSchema.type).toBe('string');
    expect(valueSchema.description).toContain('100 caractères');
    expect(property.description).toContain('Activité');
  });

  it('should make the quote a nullable string', () => {
    // Act
    const property = schema.properties[autofillPropertyName(numberField.id)];

    // Assert
    expect(property.properties.quote.type).toEqual(['string', 'null']);
  });
});

describe('buildAutofillSchema clock time', () => {
  it('should describe a clock time field in decimal hours', () => {
    // Arrange
    const bedtime: AutofillSchemaField = {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Coucher',
      fieldType: FieldType.NUMBER,
      isClockTime: true,
    };

    // Act
    const schema = buildAutofillSchema([bedtime]);

    // Assert
    const valueSchema =
      schema.properties[autofillPropertyName(bedtime.id)].properties.value
        .anyOf[0];
    expect(valueSchema.type).toBe('number');
    expect(valueSchema.description).toContain('23.5');
  });
});
