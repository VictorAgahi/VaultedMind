import { AppleWatchMetric } from '../enums/apple-watch-metric.enum.js';
import {
  convertHealthValue,
  inferFieldUnit,
  isUnitCompatible,
} from './health-metric-units.js';

describe('inferFieldUnit', () => {
  it('should choose minutes when the field name mentions minutes', () => {
    // Arrange / Act
    const inference = inferFieldUnit(AppleWatchMetric.SLEEP_DEEP, {
      name: 'Sommeil profond (min)',
      isHourly: false,
    });

    // Assert
    expect(inference).toEqual({
      compatible: true,
      unit: 'minutes',
      fromField: true,
    });
  });

  it('should choose minutes when the maximum is above a day in hours', () => {
    // Arrange / Act
    const inference = inferFieldUnit(AppleWatchMetric.SLEEP, {
      name: 'Sommeil',
      max: 600,
      isHourly: false,
    });

    // Assert
    expect(inference).toMatchObject({ unit: 'minutes', fromField: true });
  });

  it('should choose hours when the maximum fits a day in hours', () => {
    // Arrange / Act
    const inference = inferFieldUnit(AppleWatchMetric.EXERCISE_MINUTES, {
      name: 'Sport',
      max: 5,
      isHourly: false,
    });

    // Assert
    expect(inference).toMatchObject({ unit: 'hours', fromField: true });
  });

  it('should default to hours for a duration without any hint', () => {
    // Arrange / Act
    const inference = inferFieldUnit(AppleWatchMetric.SLEEP, {
      name: 'Temps de sommeil',
      isHourly: false,
    });

    // Assert
    expect(inference).toEqual({
      compatible: true,
      unit: 'hours',
      fromField: false,
    });
  });

  it('should keep no unit for a metric that is not a duration', () => {
    // Arrange / Act
    const inference = inferFieldUnit(AppleWatchMetric.STEPS, {
      name: 'Pas (min)',
      max: 30000,
      isHourly: false,
    });

    // Assert
    expect(inference).toMatchObject({ compatible: true, unit: null });
  });

  it('should give a clock-time field only the bedtime', () => {
    // Arrange
    const clockField = { name: 'Coucher', isHourly: true };

    // Act / Assert
    expect(inferFieldUnit(AppleWatchMetric.BEDTIME, clockField)).toMatchObject({
      compatible: true,
      unit: null,
    });
    expect(inferFieldUnit(AppleWatchMetric.SLEEP, clockField)).toEqual({
      compatible: false,
    });
    expect(
      inferFieldUnit(AppleWatchMetric.BEDTIME, {
        name: 'Coucher',
        isHourly: false,
      }),
    ).toEqual({ compatible: false });
  });
});

describe('isUnitCompatible', () => {
  it('should accept a unit only on a duration metric', () => {
    expect(isUnitCompatible(AppleWatchMetric.SLEEP, 'minutes', false)).toBe(
      true,
    );
    expect(isUnitCompatible(AppleWatchMetric.STEPS, 'minutes', false)).toBe(
      false,
    );
    expect(isUnitCompatible(AppleWatchMetric.STEPS, null, false)).toBe(true);
    expect(isUnitCompatible(AppleWatchMetric.BEDTIME, 'hours', true)).toBe(
      false,
    );
  });
});

describe('convertHealthValue', () => {
  it('should convert hours to whole minutes', () => {
    expect(
      convertHealthValue(AppleWatchMetric.SLEEP_DEEP, 1.53, 'minutes'),
    ).toBe(92);
  });

  it('should convert minutes to hours with two decimals', () => {
    expect(
      convertHealthValue(AppleWatchMetric.EXERCISE_MINUTES, 45, 'hours'),
    ).toBe(0.75);
  });

  it('should keep the native value rounded when the unit is the native one or none', () => {
    expect(convertHealthValue(AppleWatchMetric.SLEEP, 7.46, 'hours')).toBe(7.5);
    expect(convertHealthValue(AppleWatchMetric.SLEEP, 7.46, null)).toBe(7.5);
    expect(convertHealthValue(AppleWatchMetric.STEPS, 8042.46, undefined)).toBe(
      8042.5,
    );
  });

  it('should never convert a metric that is not a duration', () => {
    expect(convertHealthValue(AppleWatchMetric.BEDTIME, 23.25, 'minutes')).toBe(
      23.25,
    );
  });
});
