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
 * Couleur divergente pour une corrélation (-1 à 1) : argile (négatif), gris neutre, sceau (positif).
 * Renvoie une variable CSS qui suit le thème clair / sombre (voir globals.css).
 */
export function getCorrelationColor(value: number): string {
  const strength = Math.abs(value);
  if (strength < 0.15) return "var(--chart-mid)";
  const step = strength < 0.35 ? 1 : strength < 0.6 ? 2 : 3;
  return `var(--chart-${value > 0 ? "pos" : "neg"}-${step})`;
}

/**
 * Couleur du texte posé sur une cellule de corrélation.
 */
export function getCorrelationTextColor(value: number): string {
  const strength = Math.abs(value);
  if (strength >= 0.6) return "var(--chart-surface)";
  if (strength >= 0.35) return "var(--chart-on-mid)";
  return "var(--chart-ink)";
}

/**
 * Couleur d'accent (trait, chiffre) pour une corrélation : toujours lisible sur la surface.
 */
export function getCorrelationAccent(value: number): string {
  if (Math.abs(value) < 0.15) return "var(--chart-tick)";
  return value > 0 ? "var(--chart-pos-3)" : "var(--chart-neg-3)";
}
