import {
  compareBeforeDifficultDays,
  findDifficultDays,
  type BinaryItem,
} from './before-difficult-days.js';

describe('before difficult days', () => {
  it('should flag the worst 20% given the direction and need 30 values', () => {
    // Arrange
    const target = Float64Array.from({ length: 40 }, (_, i) => i);

    // Act
    const low = findDifficultDays(target, true);
    const high = findDifficultDays(target, false);
    const short = findDifficultDays(target.slice(0, 20), true);

    // Assert
    expect(low?.[0]).toBe(true);
    expect(low?.[39]).toBe(false);
    expect(high?.[39]).toBe(true);
    expect(short).toBeNull();
  });

  it('should find an item concentrated in the 3 days before difficult days', () => {
    // Arrange
    const length = 60;
    const difficult = new Array<boolean>(length).fill(false);
    [10, 25, 40, 55].forEach((day) => (difficult[day] = true));
    const marked = new Set([9, 8, 24, 23, 39, 38, 54, 53]);
    const item: BinaryItem = {
      key: 'alcohol',
      label: 'Alcool',
      category: 'event',
      present: Array.from({ length }, (_, day) => marked.has(day)),
    };

    // Act
    const [result] = compareBeforeDifficultDays(difficult, [item]);

    // Assert
    expect(result.countBefore).toBe(8);
    expect(result.daysBefore).toBe(12);
    expect(result.countOther).toBe(0);
    expect(result.lift).toBeNull();
    expect(result.p).toBeLessThan(0.001);
  });
});
