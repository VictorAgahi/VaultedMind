import { mapWithConcurrency } from './map-with-concurrency.js';

describe('mapWithConcurrency', () => {
  it('should keep the order of the results and respect the limit', async () => {
    // Arrange
    let inFlight = 0;
    let peak = 0;
    const task = async (value: number): Promise<number> => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return value * 2;
    };

    // Act
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, task);

    // Assert
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('should handle an empty list', async () => {
    expect(
      await mapWithConcurrency([], 4, (x: number) => Promise.resolve(x)),
    ).toEqual([]);
  });
});
