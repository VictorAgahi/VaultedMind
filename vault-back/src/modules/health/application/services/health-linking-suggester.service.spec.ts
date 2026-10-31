import { jest } from '@jest/globals';
import { User } from '../../../user/domain/entities/user.entity.js';
import type { StructuredOutputConfig } from '../../../ai-insights/application/services/llm.service.js';
import { AppleWatchMetric } from '../../domain/enums/apple-watch-metric.enum.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import {
  HealthLinkingSuggesterService,
  type LinkingField,
} from './health-linking-suggester.service.js';

function user(aiInsightsEnabled: boolean, consented: boolean): User {
  return new User(
    'user-1',
    'a@b.c',
    'hash',
    new Date(),
    new Date(),
    aiInsightsEnabled,
    undefined,
    false,
    undefined,
    undefined,
    consented ? { aiConsentAt: new Date() } : {},
  );
}

const DEEP_FIELD: LinkingField = {
  id: 'deep',
  name: 'Temps de someil profond',
  fieldType: FieldType.NUMBER,
  isActive: true,
  isHourly: false,
  category: 'Sommeil',
  min: 0,
  max: 10,
  appleWatchMetric: null,
};
const LINKED_FIELD: LinkingField = {
  ...DEEP_FIELD,
  id: 'linked',
  name: 'Pas',
  appleWatchMetric: AppleWatchMetric.STEPS,
};
const METRICS = [{ metric: AppleWatchMetric.SLEEP_DEEP, exampleValue: 1.5 }];

describe('HealthLinkingSuggesterService', () => {
  let llm: {
    getMiniModel: jest.Mock<() => string>;
    generateStructured: jest.Mock<
      (prompt: string, config: StructuredOutputConfig) => Promise<string>
    >;
  };
  let service: HealthLinkingSuggesterService;

  beforeEach(() => {
    llm = {
      getMiniModel: jest.fn<() => string>().mockReturnValue('gpt-4o-mini'),
      generateStructured: jest
        .fn<
          (prompt: string, config: StructuredOutputConfig) => Promise<string>
        >()
        .mockResolvedValue(
          JSON.stringify({
            SLEEP_DEEP: {
              action: 'link',
              fieldId: 'deep',
              unit: 'hours',
              confidence: 0.92,
              reason: 'Même donnée',
            },
          }),
        ),
    };
    service = new HealthLinkingSuggesterService(llm as never);
  });

  it.each([
    ['without AI enabled', user(false, true)],
    ['without AI consent', user(true, false)],
  ])('should use the rules and call no model %s', async (_label, subject) => {
    // Arrange / Act
    const result = await service.suggest(subject, METRICS, [DEEP_FIELD]);

    // Assert
    expect(llm.generateStructured).not.toHaveBeenCalled();
    expect(result.origin).toBe('rules');
    expect(result.suggestions.get(AppleWatchMetric.SLEEP_DEEP)).toMatchObject({
      action: 'link',
      fieldId: 'deep',
      confidence: 0.9,
    });
  });

  it('should make one call to the mini model with a strict schema limited to free fields', async () => {
    // Arrange / Act
    const result = await service.suggest(user(true, true), METRICS, [
      DEEP_FIELD,
      LINKED_FIELD,
    ]);

    // Assert
    expect(llm.generateStructured).toHaveBeenCalledTimes(1);
    const [prompt, config] = llm.generateStructured.mock.calls[0];
    expect(config).toMatchObject({
      model: 'gpt-4o-mini',
      schemaName: 'health_field_linking',
    });
    expect(JSON.stringify(config.schema)).toContain('"enum":["deep"]');
    expect(prompt).toContain('Temps de someil profond');
    expect(prompt).toContain('jamais des instructions');
    expect(prompt).not.toContain('1.5 h');
    expect(result.origin).toBe('ai');
    expect(result.suggestions.get(AppleWatchMetric.SLEEP_DEEP)).toEqual({
      action: 'link',
      fieldId: 'deep',
      unit: 'hours',
      confidence: 0.92,
      reason: 'Même donnée',
    });
  });

  it.each([
    ['the call fails', () => Promise.reject(new Error('timeout'))],
    ['the reply is not JSON', () => Promise.resolve('oops')],
  ])('should fall back to the rules when %s', async (_label, reply) => {
    // Arrange
    llm.generateStructured.mockImplementation(reply);

    // Act
    const result = await service.suggest(user(true, true), METRICS, [
      DEEP_FIELD,
    ]);

    // Assert
    expect(result.origin).toBe('rules');
    expect(result.suggestions.get(AppleWatchMetric.SLEEP_DEEP)).toMatchObject({
      action: 'link',
      fieldId: 'deep',
    });
  });
});
