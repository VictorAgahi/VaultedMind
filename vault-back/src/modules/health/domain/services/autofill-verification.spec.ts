import { FieldType } from '../enums/field-type.enum.js';
import type { AutofillSchemaField } from './autofill-schema.js';
import { autofillPropertyName } from './autofill-schema.js';
import {
  isQuoteInText,
  normalizeForQuote,
  parseAutofillReply,
  validateAutofillValue,
  verifyAutofillAnswers,
  type RawAutofillAnswer,
} from './autofill-verification.js';

const sleep: AutofillSchemaField = {
  id: 'sleep',
  name: 'Sommeil (h)',
  fieldType: FieldType.NUMBER,
  min: 0,
  max: 24,
};
const sport: AutofillSchemaField = {
  id: 'sport',
  name: 'Sport',
  fieldType: FieldType.BOOLEAN,
};
const meal: AutofillSchemaField = {
  id: 'meal',
  name: 'Repas',
  fieldType: FieldType.STRING,
  optionsOrder: ['Léger', 'Copieux'],
};
const note: AutofillSchemaField = {
  id: 'note',
  name: 'Activité',
  fieldType: FieldType.STRING,
};
const fields = [sleep, sport, meal, note];

describe('normalizeForQuote', () => {
  it('should lowercase, strip accents and collapse spaces and punctuation', () => {
    // Act
    const normalized = normalizeForQuote(
      "  J'ai  Dormi,  SIX heures éveillé! ",
    );

    // Assert
    expect(normalized).toBe('j ai dormi six heures eveille');
  });
});

describe('isQuoteInText', () => {
  const text = "Hier j'ai dormi six heures et demie, puis deux cafés.";

  it('should find a quote despite case, accents and punctuation differences', () => {
    // Act / Assert
    expect(isQuoteInText('DORMI six heures et demie', text)).toBe(true);
    expect(isQuoteInText('deux cafes', text)).toBe(true);
  });

  it('should reject a quote that is not in the text', () => {
    // Act / Assert
    expect(isQuoteInText('trois cafés', text)).toBe(false);
  });

  it('should reject an empty quote and a partial word', () => {
    // Act / Assert
    expect(isQuoteInText('   ', text)).toBe(false);
    expect(isQuoteInText('six heur', text)).toBe(false);
  });
});

describe('validateAutofillValue', () => {
  it('should accept a number inside the range and serialize it', () => {
    expect(validateAutofillValue(sleep, 6.5)).toBe('6.5');
  });

  it.each([
    ['below the minimum', -1],
    ['above the maximum', 30],
    ['not finite', Number.NaN],
    ['a string', '6'],
    ['a boolean', true],
  ])('should reject a number field value that is %s', (_label, value) => {
    expect(validateAutofillValue(sleep, value as number)).toBeNull();
  });

  it('should accept only real booleans for a BOOLEAN field', () => {
    expect(validateAutofillValue(sport, true)).toBe('true');
    expect(validateAutofillValue(sport, false)).toBe('false');
    expect(validateAutofillValue(sport, 'oui')).toBeNull();
  });

  it('should accept only listed options for a STRING field with options', () => {
    expect(validateAutofillValue(meal, 'Léger')).toBe('Léger');
    expect(validateAutofillValue(meal, 'Normal')).toBeNull();
  });

  it('should keep a free STRING short and non empty', () => {
    expect(validateAutofillValue(note, ' vélo ')).toBe('vélo');
    expect(validateAutofillValue(note, '   ')).toBeNull();
    expect(validateAutofillValue(note, 'x'.repeat(101))).toBeNull();
  });

  it('should never accept a DATE field', () => {
    const date: AutofillSchemaField = {
      id: 'd',
      name: 'Date',
      fieldType: FieldType.DATE,
    };
    expect(validateAutofillValue(date, '2026-01-01')).toBeNull();
  });
});

describe('verifyAutofillAnswers', () => {
  const text =
    "J'ai dormi six heures et demie. Pas de sport aujourd'hui. Repas copieux ce midi.";

  it('should keep a valid answer whose quote is in the text', () => {
    // Arrange
    const answers: RawAutofillAnswer[] = [
      { fieldId: 'sleep', value: 6.5, quote: 'dormi six heures et demie' },
    ];

    // Act
    const proposals = verifyAutofillAnswers(answers, fields, text);

    // Assert
    expect(proposals).toEqual([
      { fieldId: 'sleep', value: '6.5', quote: 'dormi six heures et demie' },
    ]);
  });

  it('should drop an answer with a missing quote or a quote absent from the text', () => {
    // Arrange
    const answers: RawAutofillAnswer[] = [
      { fieldId: 'sleep', value: 6.5, quote: null },
      { fieldId: 'sport', value: false, quote: '   ' },
      { fieldId: 'meal', value: 'Copieux', quote: 'un repas énorme' },
    ];

    // Act
    const proposals = verifyAutofillAnswers(answers, fields, text);

    // Assert
    expect(proposals).toEqual([]);
  });

  it('should drop an answer whose value is null or invalid', () => {
    // Arrange
    const answers: RawAutofillAnswer[] = [
      { fieldId: 'sleep', value: null, quote: 'six heures' },
      { fieldId: 'meal', value: 'Normal', quote: 'repas copieux' },
      { fieldId: 'sleep', value: 99, quote: 'six heures' },
    ];

    // Act
    const proposals = verifyAutofillAnswers(answers, fields, text);

    // Assert
    expect(proposals).toEqual([]);
  });

  it('should never return a proposal for a field that is not eligible', () => {
    // Arrange
    const answers: RawAutofillAnswer[] = [
      { fieldId: 'mood', value: 3, quote: 'six heures' },
    ];

    // Act
    const proposals = verifyAutofillAnswers(answers, fields, text);

    // Assert
    expect(proposals).toEqual([]);
  });

  it('should keep a single proposal per field', () => {
    // Arrange
    const answers: RawAutofillAnswer[] = [
      { fieldId: 'sleep', value: 6.5, quote: 'six heures et demie' },
      { fieldId: 'sleep', value: 7, quote: 'six heures' },
    ];

    // Act
    const proposals = verifyAutofillAnswers(answers, fields, text);

    // Assert
    expect(proposals).toHaveLength(1);
    expect(proposals[0].value).toBe('6.5');
  });
});

describe('parseAutofillReply', () => {
  it('should read the answers of the asked fields only', () => {
    // Arrange
    const reply = JSON.stringify({
      [autofillPropertyName('sleep')]: { value: 6.5, quote: 'six heures' },
      [autofillPropertyName('sport')]: { value: null, quote: null },
      f_unasked: { value: 1, quote: 'x' },
    });

    // Act
    const answers = parseAutofillReply(reply, [sleep, sport]);

    // Assert
    expect(answers).toEqual([
      { fieldId: 'sleep', value: 6.5, quote: 'six heures' },
      { fieldId: 'sport', value: null, quote: null },
    ]);
  });

  it('should treat a malformed entry as no answer and reject invalid JSON', () => {
    // Arrange
    const reply = JSON.stringify({
      [autofillPropertyName('sleep')]: 'six',
      [autofillPropertyName('sport')]: { value: { a: 1 }, quote: 3 },
    });

    // Act
    const answers = parseAutofillReply(reply, [sleep, sport]);

    // Assert
    expect(answers).toEqual([{ fieldId: 'sport', value: null, quote: null }]);
    expect(() => parseAutofillReply('not json', [sleep])).toThrow();
  });
});

describe('clock time fields', () => {
  const bedtime: AutofillSchemaField = {
    id: 'bed',
    name: 'Coucher',
    fieldType: FieldType.NUMBER,
    isClockTime: true,
  };

  it('should accept a time of day below 24 hours and reject 24 or more', () => {
    expect(validateAutofillValue(bedtime, 23.5)).toBe('23.5');
    expect(validateAutofillValue(bedtime, 24)).toBeNull();
    expect(validateAutofillValue(bedtime, -1)).toBeNull();
  });
});
