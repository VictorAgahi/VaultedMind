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

/** Nombre de jours en commun minimum avant d'afficher un lien comme fiable. */
export const MIN_RELIABLE_PAIRS = 14;

// Approximation d'Abramowitz-Stegun (erreur < 1,5e-7), suffisante pour une p-value.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/**
 * p-value bilatérale d'un coefficient de Pearson (transformée de Fisher).
 * Renvoie 1 quand l'échantillon est trop petit pour conclure.
 */
export function correlationPValue(r: number, n: number): number {
  if (n < 4 || !Number.isFinite(r)) return 1;
  const clipped = Math.max(-0.999999, Math.min(0.999999, r));
  const z = Math.atanh(clipped) * Math.sqrt(n - 3);
  return 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
}

/**
 * Correction de Benjamini-Hochberg : indique quelles hypothèses restent significatives
 * quand on teste beaucoup de paires à la fois (sinon on trouve presque toujours un faux lien).
 */
export function benjaminiHochberg(pValues: number[], falseDiscoveryRate = 0.1): boolean[] {
  const m = pValues.length;
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
  let cutoff = -1;
  order.forEach(({ p }, rank) => {
    if (p <= ((rank + 1) / m) * falseDiscoveryRate) cutoff = rank;
  });
  const significant = new Array<boolean>(m).fill(false);
  for (let rank = 0; rank <= cutoff; rank++) significant[order[rank].index] = true;
  return significant;
}
