import { FieldType } from '../enums/field-type.enum.js';
import {
  AUTOFILL_FREE_TEXT_MAX_LENGTH,
  autofillPropertyName,
  type AutofillSchemaField,
} from './autofill-schema.js';

export type AutofillValue = string | number | boolean;

/** What the model returned for one field: a value and the words that state it. */
export interface RawAutofillAnswer {
  fieldId: string;
  value: AutofillValue | null;
  quote: string | null;
}

export interface AutofillProposal {
  fieldId: string;
  /** Serialized the way the entry form stores it: a number, "true"/"false" or the text. */
  value: string;
  quote: string;
}

/**
 * Lowercases, removes accents and turns every run of whitespace or punctuation into one space,
 * so a quote still matches when the model changes casing, apostrophes or spacing.
 */
export function normalizeForQuote(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Whether the quote really appears in the text (on whole words, after normalization). */
export function isQuoteInText(quote: string, text: string): boolean {
  const normalizedQuote = normalizeForQuote(quote);
  if (normalizedQuote === '') return false;
  return ` ${normalizeForQuote(text)} `.includes(` ${normalizedQuote} `);
}

function serializeNumber(value: number): string {
  return String(value);
}

/**
 * Checks the value against the field (type, range, options, length) and returns it serialized,
 * or null when it is not acceptable.
 */
export function validateAutofillValue(
  field: AutofillSchemaField,
  value: AutofillValue,
): string | null {
  if (field.fieldType === FieldType.NUMBER) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (field.isClockTime && (value < 0 || value >= 24)) return null;
    if (field.min !== undefined && field.min !== null && value < field.min) {
      return null;
    }
    if (field.max !== undefined && field.max !== null && value > field.max) {
      return null;
    }
    return serializeNumber(value);
  }
  if (field.fieldType === FieldType.BOOLEAN) {
    return typeof value === 'boolean' ? String(value) : null;
  }
  if (field.fieldType === FieldType.STRING) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (text === '') return null;
    if (field.optionsOrder && field.optionsOrder.length > 0) {
      return field.optionsOrder.includes(text) ? text : null;
    }
    return text.length <= AUTOFILL_FREE_TEXT_MAX_LENGTH ? text : null;
  }
  return null;
}

/**
 * Keeps only the answers that can be trusted, whatever the model returned: the field must be
 * eligible (present in `eligibleFields`), the quote must exist and appear in the text, and the
 * value must be valid for the field. At most one proposal per field.
 */
export function verifyAutofillAnswers(
  answers: RawAutofillAnswer[],
  eligibleFields: AutofillSchemaField[],
  text: string,
): AutofillProposal[] {
  const fieldById = new Map(eligibleFields.map((field) => [field.id, field]));
  const proposals = new Map<string, AutofillProposal>();
  for (const answer of answers) {
    const field = fieldById.get(answer.fieldId);
    if (!field || proposals.has(field.id)) continue;
    if (answer.value === null || answer.value === undefined) continue;
    const quote = answer.quote?.trim();
    if (!quote || !isQuoteInText(quote, text)) continue;
    const value = validateAutofillValue(field, answer.value);
    if (value === null) continue;
    proposals.set(field.id, { fieldId: field.id, value, quote });
  }
  return [...proposals.values()];
}

interface RawFieldReply {
  value?: AutofillValue | null;
  quote?: string | null;
}

function isRawFieldReply(candidate: RawFieldReply | null): boolean {
  return typeof candidate === 'object' && candidate !== null;
}

/**
 * Reads the structured reply of the model. Only the keys of the asked fields are read; a
 * missing or malformed entry is an absent answer. Throws on JSON that cannot be parsed at all.
 */
export function parseAutofillReply(
  rawJson: string,
  askedFields: AutofillSchemaField[],
): RawAutofillAnswer[] {
  const parsed = JSON.parse(rawJson) as Record<string, RawFieldReply | null>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Autofill reply is not a JSON object');
  }
  const answers: RawAutofillAnswer[] = [];
  for (const field of askedFields) {
    const entry = parsed[autofillPropertyName(field.id)];
    if (!entry || !isRawFieldReply(entry)) continue;
    const value = entry.value;
    const isScalar =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean';
    answers.push({
      fieldId: field.id,
      value: isScalar ? value : null,
      quote: typeof entry.quote === 'string' ? entry.quote : null,
    });
  }
  return answers;
}
