export function mean(values: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < values.length; index++) sum += values[index];
  return values.length === 0 ? NaN : sum / values.length;
}

/** Sample standard deviation (n - 1). */
export function standardDeviation(values: ArrayLike<number>): number {
  if (values.length < 2) return NaN;
  const center = mean(values);
  let sum = 0;
  for (let index = 0; index < values.length; index++) {
    sum += (values[index] - center) ** 2;
  }
  return Math.sqrt(sum / (values.length - 1));
}

/** 1-based ranks where tied values share the average of the ranks they span. */
export function averageRanks(values: ArrayLike<number>): number[] {
  const order = Array.from({ length: values.length }, (_, index) => index).sort(
    (left, right) => values[left] - values[right],
  );
  const ranks = new Array<number>(values.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (
      end + 1 < order.length &&
      values[order[end + 1]] === values[order[start]]
    ) {
      end++;
    }
    const shared = (start + end) / 2 + 1;
    for (let position = start; position <= end; position++) {
      ranks[order[position]] = shared;
    }
    start = end + 1;
  }
  return ranks;
}

/** Pearson correlation; NaN when either side is constant or there are fewer than 2 points. */
export function pearson(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  const count = left.length;
  if (count < 2) return NaN;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftSpread = 0;
  let rightSpread = 0;
  for (let index = 0; index < count; index++) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftSpread += leftDelta * leftDelta;
    rightSpread += rightDelta * rightDelta;
  }
  const denominator = Math.sqrt(leftSpread * rightSpread);
  return denominator === 0 ? NaN : covariance / denominator;
}

/** Spearman rank correlation with average ranks for ties. */
export function spearman(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  return pearson(averageRanks(left), averageRanks(right));
}

/** Combines three pairwise correlations into the partial correlation of x and y given z. */
export function partialFromCorrelations(
  xy: number,
  xz: number,
  yz: number,
): number {
  const denominator = Math.sqrt((1 - xz * xz) * (1 - yz * yz));
  return denominator === 0 ? NaN : (xy - xz * yz) / denominator;
}

/** Partial Spearman correlation of x and y controlling for z. */
export function partialSpearman(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  z: ArrayLike<number>,
): number {
  return partialFromCorrelations(
    spearman(x, y),
    spearman(x, z),
    spearman(y, z),
  );
}

/** Benjamini-Hochberg adjusted p-values (q), in the order of the input. */
export function benjaminiHochberg(pValues: number[]): number[] {
  const total = pValues.length;
  const order = pValues
    .map((p, index) => ({ p, index }))
    .sort((left, right) => left.p - right.p);
  const adjusted = new Array<number>(total);
  let running = 1;
  for (let position = total - 1; position >= 0; position--) {
    const candidate = (order[position].p * total) / (position + 1);
    running = Math.min(running, candidate);
    adjusted[order[position].index] = running;
  }
  return adjusted;
}

/** Log of n! for n up to `size`, built once per call to the exact test. */
function logFactorialTable(size: number): number[] {
  const table = new Array<number>(size + 1).fill(0);
  for (let value = 2; value <= size; value++) {
    table[value] = table[value - 1] + Math.log(value);
  }
  return table;
}

/**
 * Two-sided Fisher exact test on [[a, b], [c, d]]: the probability of every table with the
 * same margins that is no more likely than the observed one.
 */
export function fisherExactTwoSided(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  const total = a + b + c + d;
  const logFactorial = logFactorialTable(total);
  const rowOne = a + b;
  const columnOne = a + c;
  const logProbability = (cell: number): number =>
    logFactorial[rowOne] +
    logFactorial[c + d] +
    logFactorial[columnOne] +
    logFactorial[b + d] -
    logFactorial[total] -
    logFactorial[cell] -
    logFactorial[rowOne - cell] -
    logFactorial[columnOne - cell] -
    logFactorial[total - rowOne - columnOne + cell];

  const lowest = Math.max(0, columnOne - (c + d));
  const highest = Math.min(rowOne, columnOne);
  const observed = logProbability(a);
  const tolerance = 1e-7;
  let sum = 0;
  for (let cell = lowest; cell <= highest; cell++) {
    const current = logProbability(cell);
    if (current <= observed + tolerance) sum += Math.exp(current);
  }
  return Math.min(1, sum);
}
