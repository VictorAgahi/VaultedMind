/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme,
  useMediaQuery,
  Tooltip as MuiTooltip,
  MenuProps,
  CircularProgress
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation, correlationPValue, benjaminiHochberg, MIN_RELIABLE_PAIRS } from "@/utils/math";

import {
  Tooltip,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ChartCard } from "./chart-card";
import { axisTick, chartColors, chartTooltipProps } from "@/theme/chart-tokens";
import { formatHourlyValue } from "@/utils/time-converter";

interface AdvancedAnalysesProps {
  fields: CustomField[];
  logs: DailyLog[];
  activeAdvField: string;
  setAdvSelectedField: (id: string) => void;
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number, fullHeight?: boolean }>;
  menuProps?: Partial<MenuProps>;
}

interface UseAdvancedAnalysesReturn {
  advFieldMappings: Record<string, Record<string, number>>;
  weeklyProfileData: Array<{ subject: string; A: number }>;
  statsSummary: { mean: string; min: number; max: number; volatility: string } | null;
  weekdaySpreadData: Array<{ name: string; range: [number, number] | null; avg: number | null; min: number; max: number }>;
  streakStats: { currentStreak: number; maxStreak: number; completionRate: number };
  heatmapData: Array<{ date: Date; dateStr: string; logged: boolean; value: number | null; displayLabel: string; dayNum: number; formattedDate: string }>;
  activeFieldObj: CustomField | undefined;
  expertRecommendation: string;
  autoDiscoveryInsight: { fieldA: CustomField; fieldB: CustomField; correlation: number; n: number; p: number } | null;
  getAdvVal: (log: DailyLog, fieldId: string) => number | null;
}

const useAdvancedAnalyses = (
  fields: CustomField[],
  logs: DailyLog[],
  activeAdvField: string
): UseAdvancedAnalysesReturn => {
  // Helper maps for STRING fields
  const advFieldMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};
    fields.forEach(field => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder && field.optionsOrder.length > 0) {
          field.optionsOrder.forEach((val, idx) => { valueMap[val] = idx; });
        } else {
          const uniqueValues = new Set<string>();
          logs.forEach(log => {
            const fv = log.fieldValues?.find(v => v.customFieldId === field.id);
            if (fv && fv.value) uniqueValues.add(fv.value);
          });
          Array.from(uniqueValues).sort().forEach((val, idx) => { valueMap[val] = idx; });
        }
        mappings[field.id] = valueMap;
      }
    });
    return mappings;
  }, [fields, logs]);

  const getAdvVal = React.useCallback((log: DailyLog, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!field || !fv || fv.value === undefined || fv.value === null || fv.value === "-") return null;

    if (field.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    if (field.fieldType === FieldType.STRING) {
      return advFieldMappings[fieldId]?.[fv.value] ?? null;
    }
    return null;
  }, [fields, advFieldMappings]);

  // Average weekly data for RadarChart
  const weeklyProfileData = useMemo(() => {
    if (!activeAdvField) return [];
    const dayTotals: Record<number, { sum: number, count: number }> = {
      0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 }, 6: { sum: 0, count: 0 }
    };

    logs.forEach(log => {
      const val = getAdvVal(log, activeAdvField);
      if (val !== null) {
        const day = log._day ?? new Date(log.logDate).getDay();
        dayTotals[day].sum += val;
        dayTotals[day].count += 1;
      }
    });

    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((label, index) => ({
      subject: label,
      A: dayTotals[index].count > 0 ? parseFloat((dayTotals[index].sum / dayTotals[index].count).toFixed(2)) : 0,
    }));
  }, [logs, activeAdvField, getAdvVal]);

  // Volatility and Basic Stats Summary
  const statsSummary = useMemo(() => {
    if (!activeAdvField) return null;
    const values = logs.reduce<number[]>((acc, log) => {
      const v = getAdvVal(log, activeAdvField);
      if (v !== null) acc.push(v);
      return acc;
    }, []);

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

    return {
      mean: mean.toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      volatility: cv.toFixed(1),
    };
  }, [logs, activeAdvField, getAdvVal]);

  // Weekday Spread Data for ComposedChart (Min-Max Floating Pillars + Average Line)
  const weekdaySpreadData = useMemo(() => {
    if (!activeAdvField || !logs.length) return [];

    const dayTotals: Record<number, number[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    logs.forEach(log => {
      const val = getAdvVal(log, activeAdvField);
      if (val !== null) {
        const day = log._day ?? new Date(log.logDate).getDay();
        dayTotals[day].push(val);
      }
    });

    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((label, index) => {
      const vals = dayTotals[index];
      if (vals.length === 0) {
        // Jour sans saisie : pas de barre ni de point, plutôt qu'une chute trompeuse à 0.
        return { name: label, range: null, avg: null, min: 0, max: 0 };
      }
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = parseFloat((sum / vals.length).toFixed(2));
      return {
        name: label,
        range: [min, max] as [number, number],
        avg,
        min,
        max
      };
    });
  }, [logs, activeAdvField, getAdvVal]);

  // Gamified Streaks and Completion Rates
  const streakStats = useMemo(() => {
    if (!logs.length) return { currentStreak: 0, maxStreak: 0, completionRate: 0 };

    const sortedLogs = logs.toSorted((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    const dates = new Set(sortedLogs.map(l => new Date(l.logDate).toISOString().split("T")[0]));

    let maxStreak = 0;
    let tempStreak = 0;

    const minDate = new Date(sortedLogs[0].logDate);
    const maxDate = new Date();
    const todayStr = maxDate.toISOString().split("T")[0];

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      if (dates.has(dStr)) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        if (dStr !== todayStr) {
          tempStreak = 0;
        }
      }
    }

    let currentStreak = 0;
    const checkDate = new Date();
    while (true) {
      const dStr = checkDate.toISOString().split("T")[0];
      if (dates.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (checkDate.toISOString().split("T")[0] === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    // Completion rate in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let loggedInLast30 = 0;
    dates.forEach(dStr => {
      if (new Date(dStr) >= thirtyDaysAgo) {
        loggedInLast30++;
      }
    });

    return {
      currentStreak,
      maxStreak,
      completionRate: Math.min(Math.round((loggedInLast30 / 30) * 100), 100)
    };
  }, [logs]);

  // Last 30 days heatmap grid
  const heatmapData = useMemo(() => {
    const result = [];
    const today = new Date();

    const logsByDate = new Map<string, DailyLog>();
    const fieldValuesByDate = new Map<string, string>();
    logs.forEach(log => {
      const dStr = new Date(log.logDate).toISOString().split("T")[0];
      logsByDate.set(dStr, log);
      const match = log.fieldValues?.find(fv => fv.customFieldId === activeAdvField);
      if (match) {
        fieldValuesByDate.set(dStr, match.value);
      }
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const log = logsByDate.get(dStr);
      const val = log ? getAdvVal(log, activeAdvField) : null;

      result.push({
        date: d,
        dateStr: dStr,
        logged: !!log,
        value: val,
        displayLabel: fieldValuesByDate.get(dStr) ?? "-",
        dayNum: d.getDate(),
        formattedDate: d.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long"
        })
      });
    }
    return result;
  }, [logs, activeAdvField, getAdvVal]);

  const activeFieldObj = useMemo(() => fields.find(f => f.id === activeAdvField), [fields, activeAdvField]);

  const expertRecommendation = useMemo(() => {
    if (!statsSummary) return "Pas encore assez de jours pour dégager une tendance.";
    const volatility = parseFloat(statsSummary.volatility);
    const fieldName = activeFieldObj?.name || "cet indicateur";

    if (volatility > 40) {
      return `"${fieldName}" varie beaucoup d'un jour à l'autre (variabilité de ${volatility} %). C'est fréquent et ce n'est pas un défaut. Si cela vous pèse, noter ce qui se passe les jours qui sortent du lot peut aider à les comprendre.`;
    }
    if (volatility > 20) {
      return `"${fieldName}" varie modérément (variabilité de ${volatility} %) : il reste assez stable tout en suivant les aléas de vos journées.`;
    }
    return `"${fieldName}" est très stable ces derniers temps (variabilité de ${volatility} %).`;
  }, [statsSummary, activeFieldObj]);

  // Lien le plus fort parmi ceux qui survivent à la correction pour comparaisons multiples,
  // sur au moins MIN_RELIABLE_PAIRS jours : sinon, on n'affiche rien plutôt qu'un faux lien.
  const autoDiscoveryInsight = useMemo(() => {
    const measurable = fields.filter(f =>
      f.isActive && (f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN)
    );
    if (measurable.length < 2 || logs.length < MIN_RELIABLE_PAIRS) return null;

    const candidates: { fieldA: CustomField; fieldB: CustomField; correlation: number; n: number; p: number }[] = [];
    for (let i = 0; i < measurable.length; i++) {
      for (let j = i + 1; j < measurable.length; j++) {
        const fa = measurable[i];
        const fb = measurable[j];
        const pairs: [number, number][] = [];
        logs.forEach(log => {
          const va = getAdvVal(log, fa.id);
          const vb = getAdvVal(log, fb.id);
          if (va !== null && vb !== null) pairs.push([va, vb]);
        });
        if (pairs.length < MIN_RELIABLE_PAIRS) continue;
        const correlation = calculatePearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
        if (!Number.isFinite(correlation) || Math.abs(correlation) >= 0.98) continue;
        candidates.push({ fieldA: fa, fieldB: fb, correlation, n: pairs.length, p: correlationPValue(correlation, pairs.length) });
      }
    }
    if (candidates.length === 0) return null;
    const significant = benjaminiHochberg(candidates.map(c => c.p));
    const kept = candidates.filter((_, index) => significant[index]);
    if (kept.length === 0) return null;
    return kept.reduce((best, c) => (Math.abs(c.correlation) > Math.abs(best.correlation) ? c : best));
  }, [fields, logs, getAdvVal]);

  return {
    advFieldMappings,
    weeklyProfileData,
    statsSummary,
    weekdaySpreadData,
    streakStats,
    heatmapData,
    activeFieldObj,
    expertRecommendation,
    autoDiscoveryInsight,
    getAdvVal
  };
};

export const AdvancedAnalyses: React.FC<AdvancedAnalysesProps> = ({
  fields,
  logs,
  activeAdvField,
  setAdvSelectedField,
  ChartContainer,
  menuProps
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) setMounted(true);
    });
    return () => { active = false; };
  }, []);

  const {
    advFieldMappings,
    weeklyProfileData,
    statsSummary,
    weekdaySpreadData,
    streakStats,
    heatmapData,
    activeFieldObj,
    expertRecommendation,
    autoDiscoveryInsight
  } = useAdvancedAnalyses(fields, logs, activeAdvField);

  const formatFieldValue = (v: number | null | undefined): string => {
    if (v === null || v === undefined || Number.isNaN(v)) return "-";
    if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return v >= 0.5 ? "Oui" : "Non";
    if (activeFieldObj?.fieldType === FieldType.STRING) {
      const mapping = advFieldMappings[activeAdvField];
      if (mapping) return Object.keys(mapping).find(key => mapping[key] === Math.round(v)) || v.toFixed(1);
    }
    if (activeFieldObj?.fieldType === FieldType.NUMBER && (activeFieldObj.optionsOrder || []).includes("isHourly")) {
      return formatHourlyValue(v.toString());
    }
    return String(Math.round(v * 10) / 10).replace(".", ",");
  };

  // Intensité d'une case de la carte de chaleur : mélange du sceau avec la surface, de 25 % à 100 %.
  const heatNorm = (day: (typeof heatmapData)[number]) => {
    let norm = 0.6;
    if (activeFieldObj?.fieldType === FieldType.NUMBER && statsSummary) {
      const range = statsSummary.max - statsSummary.min;
      norm = range > 0 ? (Number(day.value) - statsSummary.min) / range : 0.6;
    } else if (activeFieldObj?.fieldType === FieldType.STRING) {
      const keys = Object.keys(advFieldMappings[activeAdvField] || {});
      norm = keys.length > 1 ? Number(day.value) / (keys.length - 1) : 0.6;
    }
    return Math.max(0, Math.min(1, norm));
  };
  const heatText = (day: (typeof heatmapData)[number]) => {
    if (!day.logged) return "text.disabled";
    if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return "var(--chart-surface)";
    return heatNorm(day) >= 0.55 ? "var(--chart-surface)" : "var(--chart-ink)";
  };
  const heatColor = (day: (typeof heatmapData)[number]) => {
    if (!day.logged) return "transparent";
    if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return day.value === 1 ? "var(--chart-pos-3)" : "var(--chart-neg-2)";
    let norm = 0.6;
    if (activeFieldObj?.fieldType === FieldType.NUMBER && statsSummary) {
      const range = statsSummary.max - statsSummary.min;
      norm = range > 0 ? (Number(day.value) - statsSummary.min) / range : 0.6;
    } else if (activeFieldObj?.fieldType === FieldType.STRING) {
      const keys = Object.keys(advFieldMappings[activeAdvField] || {});
      norm = keys.length > 1 ? Number(day.value) / (keys.length - 1) : 0.6;
    }
    const pct = Math.round(25 + 75 * Math.max(0, Math.min(1, norm)));
    return `color-mix(in oklab, var(--chart-s1) ${pct}%, var(--chart-surface))`;
  };

  const stats = [
    { label: "Régularité (30 j)", value: `${streakStats.completionRate} %`, icon: CalendarMonthIcon },
    { label: "Série en cours", value: `${streakStats.currentStreak} j`, icon: LocalFireDepartmentIcon, accent: true },
    { label: "Série record", value: `${streakStats.maxStreak} j`, icon: TrendingUpIcon },
    { label: "Variabilité", value: statsSummary ? `${statsSummary.volatility} %` : "0 %", icon: InfoIcon },
  ];

  return !mounted ? (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
      <CircularProgress />
    </Box>
  ) : (
    <Grid container spacing={{ xs: 1.5, md: 3 }}>
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 360px" }, alignItems: "center" }}>
          <Box>
            <Typography variant="h5" component="h2">Analyse détaillée</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Régularité, séries et profil de la semaine pour un indicateur.
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Indicateur à analyser</InputLabel>
            <Select
              value={activeAdvField}
              label="Indicateur à analyser"
              onChange={(e) => setAdvSelectedField(e.target.value)}
              MenuProps={menuProps}
            >
              {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      {autoDiscoveryInsight && (
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, display: "flex", gap: 2, alignItems: "flex-start" }}>
            <Box sx={{ width: 40, height: 40, flex: "none", borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "secondary.light", color: "secondary.dark" }}>
              <AutoAwesomeIcon />
            </Box>
            <Box sx={{ minWidth: 0, display: "grid", gap: 0.5 }}>
              <Typography variant="overline" color="text.secondary">Lien le plus fort détecté</Typography>
              <Typography variant="body1">
                <strong>{autoDiscoveryInsight.fieldA.name}</strong> et <strong>{autoDiscoveryInsight.fieldB.name}</strong>{" "}
                {autoDiscoveryInsight.correlation >= 0 ? "évoluent ensemble" : "évoluent en sens inverse"}
                {" "}(r = {autoDiscoveryInsight.correlation.toFixed(2).replace(".", ",")}, sur {autoDiscoveryInsight.n} jours).
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {autoDiscoveryInsight.correlation >= 0
                  ? "Quand l'un augmente, l'autre a souvent tendance à augmenter aussi. Cela ne dit pas lequel influence l'autre."
                  : "Quand l'un augmente, l'autre a souvent tendance à baisser. Cela ne dit pas lequel influence l'autre."}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 5 }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, height: "100%", display: "grid", gap: 2, alignContent: "start" }}>
          <Typography variant="h5" component="h2">Assiduité</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            {stats.map(({ label, value, icon: Icon, accent }) => (
              <Box key={label} sx={{ p: 1.5, borderRadius: 3, bgcolor: "action.hover", display: "grid", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                  <Icon sx={{ fontSize: 16, color: accent ? "var(--accent-glow)" : "inherit" }} />
                  <Typography variant="caption">{label}</Typography>
                </Box>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: "primary.light" }}>
            <Typography variant="subtitle2" sx={{ color: "primary.main", mb: 0.5 }}>À retenir</Typography>
            <Typography variant="body2" sx={{ color: "text.primary" }}>{expertRecommendation}</Typography>
          </Box>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, height: "100%", display: "grid", gap: 1.5, alignContent: "start" }}>
          <Box>
            <Typography variant="h5" component="h2">30 derniers jours</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Plus la case est foncée, plus la valeur est élevée.
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75 }}>
            {heatmapData.map((day) => (
              <MuiTooltip key={day.dateStr} title={`${day.formattedDate} : ${day.logged ? formatFieldValue(Number(day.value)) : "aucune saisie"}`} enterTouchDelay={0}>
                <Box
                  sx={{
                    aspectRatio: "1",
                    borderRadius: 2,
                    bgcolor: heatColor(day),
                    border: day.logged ? "none" : "1px dashed var(--mui-palette-divider)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: heatText(day) }}>
                    {day.dayNum}
                  </Typography>
                </Box>
              </MuiTooltip>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: "3px", border: "1px dashed var(--mui-palette-divider)" }} />
              <Typography variant="caption" color="text.secondary">Aucune saisie</Typography>
            </Box>
            {activeFieldObj?.fieldType === FieldType.BOOLEAN ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: "var(--chart-pos-3)" }} />
                  <Typography variant="caption" color="text.secondary">Oui</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: "var(--chart-neg-2)" }} />
                  <Typography variant="caption" color="text.secondary">Non</Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography variant="caption" color="text.secondary">Bas</Typography>
                <Box sx={{ width: 72, height: 10, borderRadius: 1, background: "linear-gradient(90deg, color-mix(in oklab, var(--chart-s1) 25%, var(--chart-surface)), var(--chart-s1))" }} />
                <Typography variant="caption" color="text.secondary">Haut</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Profil de la semaine" subtitle="Moyenne par jour de la semaine." help="Quel jour de la semaine enregistre les niveaux moyens les plus hauts ou les plus bas.">
          <ChartContainer aspect={1.6} minHeight={260}>
            <BarChart data={weeklyProfileData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="subject" axisLine={{ stroke: chartColors.axis }} tickLine={false} tick={axisTick} tickFormatter={(v: string) => (isMobile ? v.slice(0, 3) : v)} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} width={40} tickCount={4} tickFormatter={(v) => formatFieldValue(Number(v))} />
              <Tooltip
                {...chartTooltipProps}
                cursor={{ fill: "var(--mui-palette-action-hover)" }}
                formatter={(val: any) => {
                  const numVal = Number(val);
                  if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return [`${(numVal * 100).toFixed(0)} % de oui`, "Fidélité"];
                  return [formatFieldValue(numVal), "Moyenne"];
                }}
              />
              <Bar dataKey="A" name="Moyenne" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Écart par jour" subtitle="Plage min-max et moyenne de chaque jour." help="La barre claire couvre la valeur la plus basse et la plus haute enregistrées ce jour-là, le point marque la moyenne. Une barre longue signale un jour instable.">
          <ChartContainer aspect={1.6} minHeight={260}>
            <ComposedChart data={weekdaySpreadData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="name" axisLine={{ stroke: chartColors.axis }} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} width={40} tickCount={4} tickFormatter={(v) => formatFieldValue(Number(v))} />
              <Tooltip
                {...chartTooltipProps}
                cursor={{ fill: "var(--mui-palette-action-hover)" }}
                formatter={(val: any, name: any) => {
                  if (name === "Plage") return [`${formatFieldValue(val[0])} à ${formatFieldValue(val[1])}`, "Plage"];
                  return [formatFieldValue(Number(val)), "Moyenne"];
                }}
              />
              <Bar dataKey="range" name="Plage" fill={chartColors.primary} fillOpacity={0.28} radius={4} barSize={18} />
              <Line type="monotone" dataKey="avg" name="Moyenne" stroke={chartColors.primary} strokeWidth={2} connectNulls dot={{ r: 4, fill: chartColors.primary, stroke: chartColors.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ChartContainer>
        </ChartCard>
      </Grid>
    </Grid>
  );
};
