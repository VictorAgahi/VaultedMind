/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 * Returns a value between -1 and 1.
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Returns a color based on the correlation value (-1 to 1).
 */
export function getCorrelationColor(value: number): string {
  if (value > 0) {
    // Green spectrum for positive correlation
    return `rgba(34, 197, 94, ${Math.abs(value)})`; // Tailwind green-500
  } else if (value < 0) {
    // Red spectrum for negative correlation
    return `rgba(239, 68, 68, ${Math.abs(value)})`; // Tailwind red-500
  }
  return "rgba(156, 163, 175, 0.2)"; // Grey for neutral
}
