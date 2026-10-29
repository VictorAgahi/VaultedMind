// Tokens graphiques : des références CSS, résolues par globals.css selon le mode (clair / .dark).
// Recharts accepte var(...) dans stroke / fill, la couleur suit donc le thème sans re-render.

// Ordre fixe, validé pour les daltonismes. Au-delà de 6 séries : regrouper ou découper.
export const SERIES_COLORS = [
  "var(--chart-s1)",
  "var(--chart-s2)",
  "var(--chart-s3)",
  "var(--chart-s4)",
  "var(--chart-s5)",
  "var(--chart-s6)",
] as const;

export const MAX_SERIES_MOBILE = 4;

export const chartColors = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  tick: "var(--chart-tick)",
  surface: "var(--chart-surface)",
  ink: "var(--chart-ink)",
  primary: "var(--chart-s1)",
  accent: "var(--accent-glow)",
  neutral: "var(--chart-neutral)",
} as const;

// Échelle divergente : argile (négatif) -> gris neutre -> sceau (positif).
export const DIVERGING = {
  neg: ["var(--chart-neg-1)", "var(--chart-neg-2)", "var(--chart-neg-3)"],
  mid: "var(--chart-mid)",
  pos: ["var(--chart-pos-1)", "var(--chart-pos-2)", "var(--chart-pos-3)"],
} as const;

// Graduations et axes partagés par tous les graphiques.
export const axisTick = { fontSize: 11, fill: chartColors.tick, fontWeight: 500 } as const;

export const chartTooltipProps = {
  contentStyle: {
    borderRadius: 8,
    border: "none",
    background: "var(--mui-palette-text-primary)",
    color: "var(--mui-palette-background-default)",
    fontSize: 12,
    padding: "6px 10px",
    boxShadow: "0 6px 16px rgba(15, 20, 19, 0.25)",
  },
  itemStyle: { color: "var(--mui-palette-background-default)", padding: 0 },
  labelStyle: { color: "var(--mui-palette-background-default)", fontWeight: 700, marginBottom: 2 },
  cursor: { stroke: chartColors.tick, strokeWidth: 1, strokeDasharray: "2 3" },
} as const;

export const seriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];

// Sur mobile, une date "jj/mm/aaaa" devient "jj/mm" pour laisser respirer l'axe.
export const shortDateTick = (value: string | number, compact: boolean): string => {
  const text = String(value);
  return compact && /^\d{2}\/\d{2}\/\d{4}$/.test(text) ? text.slice(0, 5) : text;
};

// Pourcentage avec espace insécable, comme en typographie française.
export const percentTick = (value: number | string): string => `${value}\u00a0%`;
