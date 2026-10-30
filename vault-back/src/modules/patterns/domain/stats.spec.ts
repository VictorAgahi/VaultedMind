import {
  averageRanks,
  benjaminiHochberg,
  fisherExactTwoSided,
  partialSpearman,
  pearson,
  spearman,
} from './stats.js';

describe('averageRanks', () => {
  it('should give tied values the average of the ranks they span', () => {
    // Arrange
    const values = [10, 20, 20, 30, 20];

    // Act
    const ranks = averageRanks(values);

    // Assert
    expect(ranks).toEqual([1, 3, 3, 5, 3]);
  });
});

describe('spearman', () => {
  it('should match the hand-computed value with ties', () => {
    // Arrange
    const x = [1, 2, 2, 3];
    const y = [1, 3, 2, 4];

    // Act
    const rho = spearman(x, y);

    // Assert
    expect(rho).toBeCloseTo(4.5 / Math.sqrt(22.5), 10);
  });

  it('should be 1 for a monotone relation and -1 for a reversed one', () => {
    // Arrange
    const x = [1, 5, 9, 20, 100];

    // Act
    const direct = spearman(x, [2, 3, 4, 5, 6]);
    const reversed = spearman(x, [6, 5, 4, 3, 2]);

    // Assert
    expect(direct).toBeCloseTo(1, 12);
    expect(reversed).toBeCloseTo(-1, 12);
  });

  it('should be NaN when a side is constant', () => {
    // Arrange
    const constant = [3, 3, 3, 3];

    // Act
    const rho = spearman(constant, [1, 2, 3, 4]);

    // Assert
    expect(rho).toBeNaN();
  });
});

describe('pearson', () => {
  it('should return the linear correlation', () => {
    // Arrange / Act
    const r = pearson([1, 2, 3], [2, 4, 7]);

    // Assert
    expect(r).toBeCloseTo(0.9933993, 6);
  });
});

describe('partialSpearman', () => {
  it('should match the hand-computed partial correlation', () => {
    // Arrange
    // rho(x,y) = 0.8, rho(x,z) = 0.8, rho(y,z) = 0.3 (sum of squared rank differences 4, 4, 14)
    const x = [1, 2, 3, 4, 5];
    const y = [2, 1, 4, 3, 5];
    const z = [1, 3, 2, 5, 4];

    // Act
    const partial = partialSpearman(x, y, z);

    // Assert
    expect(partial).toBeCloseTo(0.56 / Math.sqrt(0.36 * 0.91), 10);
  });

  it('should vanish when the link between x and y only goes through z', () => {
    // Arrange
    const z = [1, 2, 3, 4, 5, 6, 7, 8];
    const x = [1, 3, 2, 4, 6, 5, 7, 8];
    const y = [2, 1, 3, 5, 4, 6, 8, 7];

    // Act
    const direct = spearman(x, y);
    const partial = partialSpearman(x, y, z);

    // Assert
    expect(direct).toBeGreaterThan(0.8);
    expect(Math.abs(partial)).toBeLessThan(direct);
  });
});

describe('benjaminiHochberg', () => {
  it('should adjust a known example with monotone q-values', () => {
    // Arrange
    const pValues = [0.01, 0.04, 0.03, 0.005];

    // Act
    const adjusted = benjaminiHochberg(pValues);

    // Assert
    expect(adjusted[0]).toBeCloseTo(0.02, 12);
    expect(adjusted[1]).toBeCloseTo(0.04, 12);
    expect(adjusted[2]).toBeCloseTo(0.04, 12);
    expect(adjusted[3]).toBeCloseTo(0.02, 12);
  });

  it('should never exceed 1', () => {
    // Arrange / Act
    const adjusted = benjaminiHochberg([0.9, 0.95, 0.99]);

    // Assert
    expect(Math.max(...adjusted)).toBeLessThanOrEqual(1);
  });
});

describe('fisherExactTwoSided', () => {
  it('should match the tea tasting example', () => {
    // Arrange / Act
    const p = fisherExactTwoSided(3, 1, 1, 3);

    // Assert
    expect(p).toBeCloseTo(0.4857143, 6);
  });

  it('should match the textbook 2x2 example', () => {
    // Arrange / Act
    const p = fisherExactTwoSided(1, 9, 11, 3);

    // Assert
    expect(p).toBeCloseTo(0.002759, 6);
  });

  it('should be 1 for a perfectly balanced table', () => {
    // Arrange / Act
    const p = fisherExactTwoSided(5, 5, 5, 5);

    // Assert
    expect(p).toBeCloseTo(1, 10);
  });
});
