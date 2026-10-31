import { FieldType } from '../enums/field-type.enum.js';
import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  isAutofillEligible,
  type AutofillContext,
  type AutofillField,
} from './autofill-eligibility.js';

const field = (overrides: Partial<AutofillField> = {}): AutofillField => ({
  id: 'field-1',
  isActive: true,
  fieldType: FieldType.NUMBER,
  autofillMode: 'AUTO',
  construct: 'sleep',
  ...overrides,
});

const selfContext: AutofillContext = {
  subjectKind: 'SELF',
  insightTargetFieldIds: new Set<string>(),
};

const animalContext: AutofillContext = {
  subjectKind: 'ANIMAL',
  insightTargetFieldIds: new Set<string>(),
};

describe('isAutofillEligible', () => {
  describe('never eligible', () => {
    it('should refuse an inactive field even in ON mode', () => {
      // Arrange
      const target = field({ isActive: false, autofillMode: 'ON' });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should refuse an Apple Watch field even in ON mode', () => {
      // Arrange
      const target = field({
        appleWatchMetric: AppleWatchMetric.SLEEP,
        autofillMode: 'ON',
      });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should refuse a current insight target even in ON mode', () => {
      // Arrange
      const target = field({ autofillMode: 'ON' });
      const context: AutofillContext = {
        subjectKind: 'SELF',
        insightTargetFieldIds: new Set(['field-1']),
      };

      // Act
      const eligible = isAutofillEligible(target, context);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should refuse a DATE field even in ON mode', () => {
      // Arrange
      const target = field({ fieldType: FieldType.DATE, autofillMode: 'ON' });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should refuse a factual field in OFF mode', () => {
      // Arrange
      const target = field({ autofillMode: 'OFF' });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(false);
    });
  });

  describe('ON mode', () => {
    it('should accept a subjective construct', () => {
      // Arrange
      const target = field({ autofillMode: 'ON', construct: 'mood' });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(true);
    });
  });

  describe('AUTO mode', () => {
    it.each([
      'sleep',
      'physical_activity',
      'substances',
      'screens',
      'outdoors',
      'appetite',
    ])('should accept the factual construct %s', (construct) => {
      // Arrange
      const target = field({ construct });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(true);
    });

    it.each([
      'mood',
      'anxiety',
      'stress',
      'fatigue',
      'rumination',
      'loneliness',
      'self_view',
      'control',
      'pleasure',
      'achievement',
      'conflict',
      'future',
      'money',
      'work',
      'family',
      'romance',
      'social',
      'other',
    ])('should refuse the subjective construct %s', (construct) => {
      // Arrange
      const target = field({ construct });

      // Act
      const eligible = isAutofillEligible(target, animalContext);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should refuse a field without any construct', () => {
      // Arrange
      const target = field({ construct: undefined });

      // Act
      const eligible = isAutofillEligible(target, selfContext);

      // Assert
      expect(eligible).toBe(false);
    });

    it('should use the user override over the automatic construct', () => {
      // Arrange
      const overridden = field({
        construct: 'sleep',
        constructOverride: 'mood',
      });
      const promoted = field({
        construct: 'mood',
        constructOverride: 'substances',
      });

      // Act / Assert
      expect(isAutofillEligible(overridden, selfContext)).toBe(false);
      expect(isAutofillEligible(promoted, selfContext)).toBe(true);
    });

    it.each(['aggression', 'elimination', 'play', 'vet', 'environment_change'])(
      'should accept the animal construct %s only for an animal',
      (construct) => {
        // Arrange
        const target = field({ construct, fieldType: FieldType.BOOLEAN });

        // Act / Assert
        expect(isAutofillEligible(target, animalContext)).toBe(true);
        expect(isAutofillEligible(target, selfContext)).toBe(false);
        expect(
          isAutofillEligible(target, {
            subjectKind: 'OTHER_PERSON',
            insightTargetFieldIds: new Set<string>(),
          }),
        ).toBe(false);
      },
    );
  });
});
