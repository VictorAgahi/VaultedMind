import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  buildHealthLinkingSchema,
  parseHealthLinkingReply,
} from './health-linking-schema.js';

describe('buildHealthLinkingSchema', () => {
  it('should require one strict entry per metric, linking only to the given fields', () => {
    // Arrange / Act
    const schema = buildHealthLinkingSchema(
      [AppleWatchMetric.SLEEP, AppleWatchMetric.STEPS],
      ['field-1', 'field-2'],
    );

    // Assert
    expect(schema.required).toEqual(['SLEEP', 'STEPS']);
    expect(schema.additionalProperties).toBe(false);
    const variants = schema.properties.SLEEP.anyOf;
    expect(variants.map((variant) => variant.properties.action)).toEqual([
      { type: 'string', enum: ['link'] },
      { type: 'string', enum: ['propose_new'] },
      { type: 'string', enum: ['skip'] },
    ]);
    expect(variants[0].properties.fieldId).toEqual({
      type: 'string',
      enum: ['field-1', 'field-2'],
    });
    expect(variants[0].properties.unit).toEqual({
      type: ['string', 'null'],
      enum: ['hours', 'minutes', null],
    });
    for (const variant of variants) {
      expect(variant.additionalProperties).toBe(false);
      expect(variant.required).toEqual(Object.keys(variant.properties));
    }
  });

  it('should not offer linking when the user has no free field', () => {
    // Arrange / Act
    const schema = buildHealthLinkingSchema([AppleWatchMetric.SLEEP], []);

    // Assert
    expect(
      schema.properties.SLEEP.anyOf.map((variant) => variant.properties.action),
    ).toEqual([
      { type: 'string', enum: ['propose_new'] },
      { type: 'string', enum: ['skip'] },
    ]);
  });
});

describe('parseHealthLinkingReply', () => {
  it('should read every action, clamp the confidence and drop what is malformed', () => {
    // Arrange
    const reply = JSON.stringify({
      SLEEP: {
        action: 'link',
        fieldId: 'f',
        unit: 'weeks',
        confidence: 3,
        reason: 'r',
      },
      STEPS: {
        action: 'propose_new',
        suggestedName: 'Pas',
        relevance: 'medium',
        reason: '',
      },
      BEDTIME: { action: 'skip', reason: 'non' },
      SLEEP_REM: { action: 'dance' },
      HEART_RATE_VARIABILITY: { action: 'skip', reason: 'hors liste' },
    });

    // Act
    const parsed = parseHealthLinkingReply(reply, [
      AppleWatchMetric.SLEEP,
      AppleWatchMetric.STEPS,
      AppleWatchMetric.BEDTIME,
      AppleWatchMetric.SLEEP_REM,
    ]);

    // Assert
    expect(parsed.get(AppleWatchMetric.SLEEP)).toEqual({
      action: 'link',
      fieldId: 'f',
      unit: null,
      confidence: 1,
      reason: 'r',
    });
    expect(parsed.get(AppleWatchMetric.STEPS)).toMatchObject({
      action: 'propose_new',
      relevance: 'low',
    });
    expect(parsed.get(AppleWatchMetric.BEDTIME)).toEqual({
      action: 'skip',
      reason: 'non',
    });
    expect(parsed.has(AppleWatchMetric.SLEEP_REM)).toBe(false);
    expect(parsed.has(AppleWatchMetric.HEART_RATE_VARIABILITY)).toBe(false);
  });

  it('should refuse a reply that is not an object', () => {
    expect(() => parseHealthLinkingReply('[]', [])).toThrow();
    expect(() => parseHealthLinkingReply('not json', [])).toThrow();
  });
});
