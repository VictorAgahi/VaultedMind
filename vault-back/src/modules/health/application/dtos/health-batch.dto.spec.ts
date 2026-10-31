import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HealthBatchDto, MAX_SLEEP_SAMPLES } from './health-batch.dto.js';

async function errorsFor(payload: object): Promise<string[]> {
  const dto = plainToInstance(HealthBatchDto, payload);
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('HealthBatchDto', () => {
  const sample = {
    value: 'Core',
    start: '2026-10-30T23:10:00+01:00',
    end: '2026-10-31T02:00:00+01:00',
  };

  it('should accept a complete payload', async () => {
    // Act
    const errors = await errorsFor({
      date: '2026-10-31',
      quantities: [{ metric: 'STEPS', value: 8042 }],
      sleepSamples: [sample],
    });

    // Assert
    expect(errors).toEqual([]);
  });

  it('should accept a payload with the date only', async () => {
    expect(await errorsFor({ date: '2026-10-31' })).toEqual([]);
  });

  it('should coerce numeric strings sent by Shortcuts', async () => {
    // Arrange
    const dto = plainToInstance(HealthBatchDto, {
      date: '2026-10-31',
      quantities: [{ metric: 'STEPS', value: '8042,5' }],
    });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toEqual([]);
    expect(dto.quantities?.[0].value).toBe(8042.5);
  });

  it.each([
    '2026-13-01',
    '2026-02-30',
    '31/10/2026',
    '2026-10-31T10:00:00Z',
    '',
  ])('should reject the date %p', async (date) => {
    expect(await errorsFor({ date })).toContain('date');
  });

  it('should reject an unknown metric', async () => {
    expect(
      await errorsFor({
        date: '2026-10-31',
        quantities: [{ metric: 'BLOOD_SUGAR', value: 1 }],
      }),
    ).toContain('quantities');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 'abc'])(
    'should reject the quantity value %p',
    async (value) => {
      expect(
        await errorsFor({
          date: '2026-10-31',
          quantities: [{ metric: 'STEPS', value }],
        }),
      ).toContain('quantities');
    },
  );

  it('should reject more than the maximum number of sleep samples', async () => {
    // Arrange
    const sleepSamples = Array.from(
      { length: MAX_SLEEP_SAMPLES + 1 },
      () => sample,
    );

    // Act
    const errors = await errorsFor({ date: '2026-10-31', sleepSamples });

    // Assert
    expect(errors).toContain('sleepSamples');
  });

  it('should reject a sleep sample with an invalid time', async () => {
    expect(
      await errorsFor({
        date: '2026-10-31',
        sleepSamples: [{ ...sample, start: 'yesterday' }],
      }),
    ).toContain('sleepSamples');
  });

  it.each([null, '', '  '])(
    'should accept the empty reading %p as a skipped value',
    async (value) => {
      // Arrange
      const dto = plainToInstance(HealthBatchDto, {
        date: '2026-10-31',
        quantities: [{ metric: 'STEPS', value }],
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toEqual([]);
      expect(dto.quantities?.[0].value ?? null).toBeNull();
    },
  );

  it('should accept sleep lines and reject an oversized text', async () => {
    expect(
      await errorsFor({ date: '2026-10-31', sleepLines: 'a|b|c' }),
    ).toEqual([]);
    expect(
      await errorsFor({ date: '2026-10-31', sleepLines: 'x'.repeat(100_001) }),
    ).toContain('sleepLines');
  });
});
