import { decideExtraction, nextFailureCount } from './signal-staleness.js';

describe('decideExtraction', () => {
  it('should extract when there is no row', () => {
    expect(decideExtraction(null, 'h1')).toBe('extract');
  });

  it('should consider a row with payload and same hash fresh', () => {
    // Arrange
    const row = { sourceHash: 'h1', hasPayload: true, failureCount: 0 };

    // Act
    const decision = decideExtraction(row, 'h1');

    // Assert
    expect(decision).toBe('fresh');
  });

  it('should extract again when the hash changed', () => {
    // Arrange
    const row = { sourceHash: 'h1', hasPayload: true, failureCount: 0 };

    // Act
    const decision = decideExtraction(row, 'h2');

    // Assert
    expect(decision).toBe('extract');
  });

  it('should retry below 3 failures and give up from 3', () => {
    // Arrange
    const failed = (failureCount: number) => ({
      sourceHash: 'h1',
      hasPayload: false,
      failureCount,
    });

    // Act and Assert
    expect(decideExtraction(failed(2), 'h1')).toBe('extract');
    expect(decideExtraction(failed(3), 'h1')).toBe('give-up');
  });

  it('should retry a given-up note when its hash changed', () => {
    // Arrange
    const row = { sourceHash: 'h1', hasPayload: false, failureCount: 5 };

    // Act
    const decision = decideExtraction(row, 'h2');

    // Assert
    expect(decision).toBe('extract');
  });
});

describe('nextFailureCount', () => {
  it('should increment on the same hash and restart on a new one', () => {
    expect(nextFailureCount(null, 'h1')).toBe(1);
    expect(nextFailureCount({ sourceHash: 'h1', failureCount: 2 }, 'h1')).toBe(
      3,
    );
    expect(nextFailureCount({ sourceHash: 'h0', failureCount: 2 }, 'h1')).toBe(
      1,
    );
  });
});
