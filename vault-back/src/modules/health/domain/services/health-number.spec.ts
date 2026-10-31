import { parseHealthNumber } from './health-number.js';

describe('parseHealthNumber', () => {
  it.each([
    ['8042', 8042],
    ['8042.5', 8042.5],
    ['7,5', 7.5],
    ['8 042,5', 8042.5],
    ['8 042,5', 8042.5],
    ['8 042,5', 8042.5],
    ['8,042.5', 8042.5],
    ['1.234,5', 1234.5],
    ['1,234,567', 1234567],
    ['0', 0],
  ])('should read %p as %p', (raw, expected) => {
    expect(parseHealthNumber(raw)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1e5x', 'NaN', 'Infinity', '12 km'])(
    'should reject %p',
    (raw) => {
      expect(parseHealthNumber(raw)).toBeNull();
    },
  );
});
