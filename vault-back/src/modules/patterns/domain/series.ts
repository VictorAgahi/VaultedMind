/** A daily series with NaN for missing days, plus dense rank codes for fast permutation tests. */
export interface EncodedSeries {
  values: Float64Array;
  /** Dense code of each value in sorted order, -1 when missing. */
  codes: Int32Array;
  distinct: number;
}

export function encodeSeries(source: ArrayLike<number | null>): EncodedSeries {
  const values = new Float64Array(source.length);
  for (let index = 0; index < source.length; index++) {
    const value = source[index];
    values[index] = value === null || value === undefined ? NaN : value;
  }
  const sortedDistinct = [
    ...new Set(Array.from(values).filter((value) => !Number.isNaN(value))),
  ].sort((left, right) => left - right);
  const codeOf = new Map(sortedDistinct.map((value, code) => [value, code]));
  const codes = new Int32Array(values.length);
  for (let index = 0; index < values.length; index++) {
    codes[index] = Number.isNaN(values[index])
      ? -1
      : (codeOf.get(values[index]) ?? -1);
  }
  return { values, codes, distinct: sortedDistinct.length };
}
