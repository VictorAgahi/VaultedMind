import {
  PERMUTATION_BLOCK_DAYS,
  blockPermutation,
} from './block-permutation.js';
import { hashSeed, mulberry32 } from './prng.js';

describe('mulberry32', () => {
  it('should produce the same sequence for the same seed', () => {
    // Arrange
    const first = mulberry32(42);
    const second = mulberry32(42);

    // Act
    const left = Array.from({ length: 5 }, () => first());
    const right = Array.from({ length: 5 }, () => second());

    // Assert
    expect(left).toEqual(right);
  });

  it('should differ between seeds and stay in [0, 1)', () => {
    // Arrange
    const first = mulberry32(1);
    const second = mulberry32(2);

    // Act
    const left = Array.from({ length: 1000 }, () => first());
    const right = Array.from({ length: 1000 }, () => second());

    // Assert
    expect(left).not.toEqual(right);
    expect(Math.min(...left)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...left)).toBeLessThan(1);
  });
});

describe('hashSeed', () => {
  it('should be stable and sensitive to the input', () => {
    // Arrange / Act / Assert
    expect(hashSeed('user|target|predictor|1')).toBe(
      hashSeed('user|target|predictor|1'),
    );
    expect(hashSeed('user|target|predictor|1')).not.toBe(
      hashSeed('user|target|predictor|0'),
    );
  });
});

describe('blockPermutation', () => {
  const permute = (seed: number, length: number): Int32Array => {
    const out = new Int32Array(length);
    blockPermutation(length, PERMUTATION_BLOCK_DAYS, mulberry32(seed), out);
    return out;
  };

  it('should be deterministic for a seed', () => {
    // Arrange / Act
    const first = permute(7, 90);
    const second = permute(7, 90);

    // Assert
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('should be a permutation made of contiguous blocks', () => {
    // Arrange / Act
    const order = permute(11, 90);

    // Assert
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 90 }, (_, index) => index),
    );
    let breaks = 0;
    for (let index = 1; index < order.length; index++) {
      if (order[index] !== order[index - 1] + 1) breaks++;
    }
    expect(breaks).toBeLessThanOrEqual(Math.ceil(90 / PERMUTATION_BLOCK_DAYS));
  });

  it('should actually move blocks', () => {
    // Arrange / Act
    const order = permute(3, 90);

    // Assert
    expect(Array.from(order)).not.toEqual(
      Array.from({ length: 90 }, (_, index) => index),
    );
  });
});
