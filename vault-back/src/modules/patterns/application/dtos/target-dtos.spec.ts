import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  InsightTargetDto,
  UpdatePreferencesDto,
} from '../../../user/application/dtos/update-preferences.dto.js';
import { ObviousOverrideDto } from './obvious-override.dto.js';

const FIELD_ID = '8f4b6c1e-3d2a-4c5b-9a7e-1f2d3c4b5a69';

const errorsOf = <T extends object>(type: new () => T, plain: object): number =>
  validateSync(plainToInstance(type, plain)).length;

describe('InsightTargetDto', () => {
  it('should accept the three directions and an optional value', () => {
    for (const direction of [
      'HIGHER_IS_BETTER',
      'LOWER_IS_BETTER',
      'NEUTRAL',
    ]) {
      expect(errorsOf(InsightTargetDto, { fieldId: FIELD_ID, direction })).toBe(
        0,
      );
    }
    expect(
      errorsOf(InsightTargetDto, {
        fieldId: FIELD_ID,
        direction: 'NEUTRAL',
        value: 'agressif',
      }),
    ).toBe(0);
  });

  it('should reject an unknown direction, an empty or too long value', () => {
    expect(
      errorsOf(InsightTargetDto, { fieldId: FIELD_ID, direction: 'UP' }),
    ).toBeGreaterThan(0);
    expect(
      errorsOf(InsightTargetDto, {
        fieldId: FIELD_ID,
        direction: 'NEUTRAL',
        value: '',
      }),
    ).toBeGreaterThan(0);
    expect(
      errorsOf(InsightTargetDto, {
        fieldId: FIELD_ID,
        direction: 'NEUTRAL',
        value: 'x'.repeat(101),
      }),
    ).toBeGreaterThan(0);
  });
});

describe('UpdatePreferencesDto', () => {
  const target = { fieldId: FIELD_ID, direction: 'NEUTRAL' };

  it('should allow 6 targets and refuse 7', () => {
    expect(
      errorsOf(UpdatePreferencesDto, {
        insightTargets: Array.from({ length: 6 }, () => target),
      }),
    ).toBe(0);
    expect(
      errorsOf(UpdatePreferencesDto, {
        insightTargets: Array.from({ length: 7 }, () => target),
      }),
    ).toBeGreaterThan(0);
  });

  it('should carry absent targets as undefined so that they are kept', () => {
    // Act
    const dto = plainToInstance(UpdatePreferencesDto, {
      reminderEnabled: false,
    });

    // Assert
    expect(dto.insightTargets).toBeUndefined();
    expect(errorsOf(UpdatePreferencesDto, { reminderEnabled: false })).toBe(0);
  });
});

describe('ObviousOverrideDto', () => {
  it('should accept true, false and null', () => {
    for (const obvious of [true, false, null]) {
      expect(
        errorsOf(ObviousOverrideDto, { findingKey: 'a|b|0|+', obvious }),
      ).toBe(0);
    }
  });

  it('should reject an empty key and a non-boolean verdict', () => {
    expect(
      errorsOf(ObviousOverrideDto, { findingKey: '', obvious: true }),
    ).toBeGreaterThan(0);
    expect(
      errorsOf(ObviousOverrideDto, { findingKey: 'k', obvious: 'yes' }),
    ).toBeGreaterThan(0);
  });
});
