import { FieldType } from '../enums/field-type.enum.js';

/** The fields the agent may fill, as the schema and the verification need them. */
export interface AutofillSchemaField {
  id: string;
  name: string;
  fieldType: FieldType;
  optionsOrder?: string[];
  min?: number;
  max?: number;
  /** NUMBER field holding a time of day as decimal hours (23.5 for 23h30), e.g. a bedtime. */
  isClockTime?: boolean;
}

export const AUTOFILL_FREE_TEXT_MAX_LENGTH = 100;

export type AutofillJsonSchemaProperty =
  | { type: 'string'; enum: string[]; description: string }
  | { type: 'string'; description: string }
  | { type: 'number'; description: string }
  | { type: 'boolean'; description: string };

export interface AutofillFieldSchema {
  type: 'object';
  properties: {
    value: { anyOf: [AutofillJsonSchemaProperty, { type: 'null' }] };
    quote: { type: ['string', 'null']; description: string };
  };
  required: ['value', 'quote'];
  additionalProperties: false;
  description: string;
}

export interface AutofillJsonSchema {
  type: 'object';
  properties: Record<string, AutofillFieldSchema>;
  required: string[];
  additionalProperties: false;
}

/** Property name of a field in the schema; the id is a UUID, the name is only a description. */
export function autofillPropertyName(fieldId: string): string {
  return `f_${fieldId.replace(/-/g, '')}`;
}

export function fieldIdOfAutofillProperty(
  property: string,
  fields: AutofillSchemaField[],
): string | undefined {
  return fields.find((field) => autofillPropertyName(field.id) === property)
    ?.id;
}

function describeRange(field: AutofillSchemaField): string {
  const bounds: string[] = [];
  if (field.min !== undefined && field.min !== null) {
    bounds.push(`minimum ${field.min}`);
  }
  if (field.max !== undefined && field.max !== null) {
    bounds.push(`maximum ${field.max}`);
  }
  return bounds.length > 0 ? ` (${bounds.join(', ')})` : '';
}

function valueSchemaOf(field: AutofillSchemaField): AutofillJsonSchemaProperty {
  const label = `Champ "${field.name}"`;
  if (field.fieldType === FieldType.NUMBER && field.isClockTime) {
    return {
      type: 'number',
      description: `${label}. Heure du jour en heures décimales, de 0 à 23.99 (23h30 s'écrit 23.5), seulement si l'auteur donne une heure précise.`,
    };
  }
  if (field.fieldType === FieldType.NUMBER) {
    return {
      type: 'number',
      description: `${label}${describeRange(field)}. Nombre exact dit par l'auteur.`,
    };
  }
  if (field.fieldType === FieldType.BOOLEAN) {
    return {
      type: 'boolean',
      description: `${label}. true ou false seulement si l'auteur l'affirme ou le nie explicitement.`,
    };
  }
  if (field.optionsOrder && field.optionsOrder.length > 0) {
    return {
      type: 'string',
      enum: [...field.optionsOrder],
      description: `${label}. Choix possibles : ${field.optionsOrder.join(' | ')}.`,
    };
  }
  return {
    // The length limit lives in the description: strict structured outputs reject maxLength
    type: 'string',
    description: `${label}. Texte court (${AUTOFILL_FREE_TEXT_MAX_LENGTH} caractères au plus) repris des mots de l'auteur.`,
  };
}

/**
 * Strict JSON schema with one {value, quote} object per eligible field.
 * Both keys are required: "no information" is expressed as null, never by omission.
 */
export function buildAutofillSchema(
  fields: AutofillSchemaField[],
): AutofillJsonSchema {
  const properties: Record<string, AutofillFieldSchema> = {};
  for (const field of fields) {
    properties[autofillPropertyName(field.id)] = {
      type: 'object',
      description: `Information explicite sur le champ "${field.name}", ou null si le texte n'en donne aucune.`,
      properties: {
        value: { anyOf: [valueSchemaOf(field), { type: 'null' }] },
        quote: {
          type: ['string', 'null'],
          description:
            'Mots exacts copiés du texte qui énoncent cette valeur, ou null.',
        },
      },
      required: ['value', 'quote'],
      additionalProperties: false,
    };
  }
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
