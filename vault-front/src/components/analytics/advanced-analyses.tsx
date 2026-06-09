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
import AssessmentIcon from "@mui/icons-material/Assessment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation } from "@/utils/math";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
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
  weekdaySpreadData: Array<{ name: string; range: [number, number]; avg: number; min: number; max: number }>;
  streakStats: { currentStreak: number; maxStreak: number; completionRate: number };
  heatmapData: Array<{ date: Date; dateStr: string; logged: boolean; value: number | null; displayLabel: string; dayNum: number; formattedDate: string }>;
  activeFieldObj: CustomField | undefined;
  expertRecommendation: string;
  autoDiscoveryInsight: { fieldA: CustomField; fieldB: CustomField; correlation: number } | null;
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
        return { name: label, range: [0, 0] as [number, number], avg: 0, min: 0, max: 0 };
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
    if (!statsSummary) return "Pas assez de données pour générer un diagnostic.";
    const volatility = parseFloat(statsSummary.volatility);
    const fieldName = activeFieldObj?.name || "cet indicateur";

    if (volatility > 40) {
      return `Votre routine pour "${fieldName}" est hautement irrégulière (Variabilité de ${volatility}%). Les fluctuations importantes d'un jour à l'autre peuvent perturber votre équilibre. Essayez de fixer un rituel ou une heure fixe pour ancrer cette habitude.`;
    }
    if (volatility > 20) {
      return `Votre suivi pour "${fieldName}" montre une flexibilité modérée (Variabilité de ${volatility}%). C'est idéal pour s'adapter aux imprévus de la vie tout en conservant une bonne ligne de conduite générale.`;
    }
    return `Remarquable ! Votre stabilité pour "${fieldName}" est exemplaire (Variabilité de seulement ${volatility}%). Vous faites preuve d'une discipline de fer qui consolide durablement votre rythme biologique.`;
  }, [statsSummary, activeFieldObj]);

  const autoDiscoveryInsight = useMemo(() => {
    if (fields.length < 2 || logs.length < 5) return null;

    const measurable = fields.filter(f =>
      f.isActive && (f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN)
    );

    let bestPair: { fieldA: CustomField; fieldB: CustomField; correlation: number } | null = null;
    let maxAbs = 0;

    for (let i = 0; i < measurable.length; i++) {
      for (let j = i + 1; j < measurable.length; j++) {
        const fa = measurable[i];
        const fb = measurable[j];

        const pairs: [number, number][] = [];
        logs.forEach(log => {
          const va = getAdvVal(log, fa.id);
          const vb = getAdvVal(log, fb.id);
          if (va !== null && vb !== null) {
            pairs.push([va, vb]);
          }
        });

        if (pairs.length >= 5) {
          const x = pairs.map(p => p[0]);
          const y = pairs.map(p => p[1]);
          const correlation = calculatePearsonCorrelation(x, y);
          const abs = Math.abs(correlation);
          if (!isNaN(abs) && abs > maxAbs && abs < 0.98) {
            maxAbs = abs;
            bestPair = { fieldA: fa, fieldB: fb, correlation };
          }
        }
      }
    }

    return bestPair;
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

  const refinedPaperStyle = {
    p: { xs: 3, md: 4 },
    borderRadius: 6,
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
    bgcolor: "background.paper",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const
  };

  return !mounted ? (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
      <CircularProgress />
    </Box>
  ) : (
    <Grid container spacing={4}>
      {/* Top Filter Selection Panel */}
      <Grid size={{ xs: 12 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
          <Grid container spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AssessmentIcon sx={{ color: "#6366f1" }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Analyses Comportementales Avancées</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Explorez la stabilité de vos rituels, découvrez vos séries de réussite et vos profils temporels.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Indicateur à décortiquer</InputLabel>
                <Select
                  value={activeAdvField}
                  label="Indicateur à décortiquer"
                  onChange={(e) => setAdvSelectedField(e.target.value)}
                  sx={{ borderRadius: 3 }}
                  MenuProps={menuProps}
                >
                  {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Eureka Discovery Card (Feature added!) */}
      {autoDiscoveryInsight && (
        <Grid size={{ xs: 12 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 5,
              background: autoDiscoveryInsight.correlation >= 0
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(99, 102, 241, 0.06) 100%)"
                : "linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, rgba(245, 158, 11, 0.06) 100%)",
              border: autoDiscoveryInsight.correlation >= 0
                ? "1px solid rgba(16, 185, 129, 0.2)"
                : "1px solid rgba(244, 63, 94, 0.2)",
              boxShadow: "0 10px 20px rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "flex-start",
              gap: 2.5,
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: 4,
                height: "100%",
                bgcolor: autoDiscoveryInsight.correlation >= 0 ? "#10b981" : "#f43f5e"
              }
            }}
          >
            <Box sx={{
              p: 1.5,
              bgcolor: autoDiscoveryInsight.correlation >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
              borderRadius: 3.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: autoDiscoveryInsight.correlation >= 0 ? "#10b981" : "#f43f5e"
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                💡 La Découverte Majeure de VaultedMind
              </Typography>
              <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.6 }}>
                Nous avons analysé l&apos;intégralité de vos journaux et découvert une liaison statistique remarquable :
                votre indicateur <strong>{autoDiscoveryInsight.fieldA.name}</strong> et votre indicateur <strong>{autoDiscoveryInsight.fieldB.name}</strong> sont fortement connectés,
                avec un coefficient de corrélation de <strong>{Math.round(autoDiscoveryInsight.correlation * 100)}%</strong>.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, fontWeight: 700 }}>
                {autoDiscoveryInsight.correlation >= 0
                  ? "📈 Corrélation Positive : Lorsque l'une de ces variables augmente, l'autre a une très forte tendance statistique à s'élever également. C'est un levier d'action extraordinaire pour structurer votre routine !"
                  : "📉 Corrélation Inverse : Ces deux facteurs évoluent en sens inverse. Quand l'un augmente, l'autre diminue. Vous pouvez agir sur l'un pour tempérer l'autre."}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      )}

      {/* Grid 1: Radar Chart (Weekly Average) */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={0} sx={refinedPaperStyle}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Profil Circadien Hebdomadaire</Typography>
              <Typography variant="body2" color="text.secondary">Moyenne par jour de la semaine</Typography>
            </Box>
            <MuiTooltip title="Ce radar montre quel jour de la semaine enregistre les niveaux moyens les plus élevés ou bas.">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>

          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
            <ChartContainer aspect={1.1} mobileAspect={1.0} minHeight={300}>
              <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "65%" : "80%"} data={weeklyProfileData}>
                <PolarGrid stroke="rgba(0,0,0,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600, fill: theme.palette.text.secondary }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  formatter={(val: any) => {
                    const numVal = Number(val);
                    if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return [`${(numVal * 100).toFixed(0)}% Oui`, "Fidélité"];
                    if (activeFieldObj?.fieldType === FieldType.STRING) {
                      const mapping = advFieldMappings[activeAdvField];
                      if (mapping) {
                        const label = Object.keys(mapping).find(key => mapping[key] === Math.round(numVal));
                        return [label || numVal.toFixed(2), "Valeur"];
                      }
                    }
                    if (activeFieldObj?.fieldType === FieldType.NUMBER) {
                      const isHourly = (activeFieldObj.optionsOrder || []).includes("isHourly");
                      if (isHourly) return [formatHourlyValue(numVal.toString()), "Moyenne"];
                    }
                    return [numVal.toFixed(2), "Moyenne"];
                  }}
                />
                <Radar
                  name="Moyenne"
                  dataKey="A"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.45}
                />
              </RadarChart>
            </ChartContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Grid 2: Composed Weekday Spread Chart (Min/Max Pillars + Avg Line) */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper elevation={0} sx={refinedPaperStyle}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Dispersion & Variabilité par Jour</Typography>
              <Typography variant="body2" color="text.secondary">Piliers Min-Max et Ligne de Moyenne</Typography>
            </Box>
            <MuiTooltip title="Les barres translucides représentent le spectre complet (le min et le max enregistrés ce jour-là) et la ligne verte montre votre moyenne. Idéal pour voir vos jours instables !">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 300 }}>
            <ChartContainer aspect={1.1} mobileAspect={1.0} minHeight={300}>
              <ComposedChart data={weekdaySpreadData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  formatter={(val: any, name: any) => {
                    const formatVal = (v: number) => {
                      if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return v === 1 ? "Oui" : "Non";
                      if (activeFieldObj?.fieldType === FieldType.STRING) {
                        const mapping = advFieldMappings[activeAdvField];
                        if (mapping) return Object.keys(mapping).find(key => mapping[key] === Math.round(v)) || v.toFixed(1);
                      }
                      if (activeFieldObj?.fieldType === FieldType.NUMBER) {
                        const isHourly = (activeFieldObj.optionsOrder || []).includes("isHourly");
                        if (isHourly) return formatHourlyValue(v.toString());
                      }
                      return v.toString();
                    };

                    if (name === "range") {
                      return [`Min: ${formatVal(val[0])} / Max: ${formatVal(val[1])}`, "Étendue"];
                    }
                    return [formatVal(Number(val)), "Moyenne"];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="range"
                  name="Étendue (Min-Max)"
                  fill="rgba(99, 102, 241, 0.12)"
                  stroke="rgba(99, 102, 241, 0.4)"
                  strokeWidth={1}
                  radius={4}
                  barSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Moyenne"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                />
              </ComposedChart>
            </ChartContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Grid 3: Gamified Stats Cards & Expert Recommendation */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper elevation={0} sx={{ ...refinedPaperStyle, gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Scorecards & Assiduité</Typography>

          <Grid container spacing={2}>
            {/* Completion Rate */}
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 2, bgcolor: "rgba(99, 102, 241, 0.04)", border: "1px solid rgba(99, 102, 241, 0.08)", borderRadius: 4, textAlign: "center" }}>
                <CalendarMonthIcon sx={{ color: "#6366f1", mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>Régularité (30j)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#6366f1", mt: 0.5 }}>{streakStats.completionRate}%</Typography>
              </Box>
            </Grid>

            {/* Current Streak */}
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 2, bgcolor: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.08)", borderRadius: 4, textAlign: "center" }}>
                <LocalFireDepartmentIcon sx={{ color: "#f59e0b", mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>Série en cours</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#f59e0b", mt: 0.5 }}>{streakStats.currentStreak} j</Typography>
              </Box>
            </Grid>

            {/* Max Streak */}
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 2, bgcolor: "rgba(244, 63, 94, 0.04)", border: "1px solid rgba(244, 63, 94, 0.08)", borderRadius: 4, textAlign: "center" }}>
                <TrendingUpIcon sx={{ color: "#f43f5e", mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>Série Record</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#f43f5e", mt: 0.5 }}>{streakStats.maxStreak} j</Typography>
              </Box>
            </Grid>

            {/* Volatility Coefficient */}
            <Grid size={{ xs: 6 }}>
              <Box sx={{ p: 2, bgcolor: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.08)", borderRadius: 4, textAlign: "center" }}>
                <InfoIcon sx={{ color: "#10b981", mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>Variabilité (CV)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#10b981", mt: 0.5 }}>{statsSummary ? `${statsSummary.volatility}%` : "0%"}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 3, bgcolor: "rgba(99, 102, 241, 0.03)", borderRadius: 4, border: "1px dashed rgba(99, 102, 241, 0.2)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4f46e5" }}>Diagnostic de l&apos;Expert</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary", lineHeight: 1.6 }}>
              &ldquo;{expertRecommendation}&rdquo;
            </Typography>
          </Paper>
        </Paper>
      </Grid>

      {/* Grid 4: 30-Day Activity Heatmap Calendar */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper elevation={0} sx={refinedPaperStyle}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Calendrier d&apos;Activité (Derniers 30 Jours)</Typography>
              <Typography variant="body2" color="text.secondary">Visualisez d&apos;un coup d&apos;œil votre assiduité et vos résultats</Typography>
            </Box>
            <MuiTooltip title="Comme sur GitHub, chaque carré représente un jour. Plus la couleur est marquée, plus la valeur enregistrée est élevée.">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>

          <Box sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            p: 2,
            bgcolor: "rgba(0,0,0,0.01)",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.02)",
            justifyContent: "flex-start",
            alignItems: "center",
            mt: 2
          }}>
            {heatmapData.map((day) => {
              // Color calculation logic based on field value
              let bg = "rgba(0,0,0,0.03)";
              let border = "1px solid rgba(0,0,0,0.05)";

              if (day.logged) {
                border = "none";
                if (activeFieldObj?.fieldType === FieldType.BOOLEAN) {
                  bg = day.value === 1 ? "#10b981" : "#ef4444";
                } else if (activeFieldObj?.fieldType === FieldType.NUMBER && statsSummary) {
                  const min = statsSummary.min;
                  const max = statsSummary.max;
                  const range = max - min;
                  const norm = range > 0 ? (Number(day.value) - min) / range : 0.6;
                  bg = `rgba(99, 102, 241, ${0.25 + 0.75 * norm})`;
                } else if (activeFieldObj?.fieldType === FieldType.STRING) {
                  const mapping = advFieldMappings[activeAdvField];
                  if (mapping) {
                    const keys = Object.keys(mapping);
                    const norm = keys.length > 1 ? Number(day.value) / (keys.length - 1) : 0.6;
                    bg = `rgba(139, 92, 246, ${0.25 + 0.75 * norm})`;
                  }
                } else {
                  bg = "#6366f1";
                }
              } else {
                border = "1px dashed rgba(0,0,0,0.1)";
              }

              // Pretty-format dates
              const formattedDate = day.formattedDate;

              const formatVal = (v: any) => {
                if (v === null || v === undefined) return "Aucun log";
                if (activeFieldObj?.fieldType === FieldType.BOOLEAN) return v === 1 ? "Oui" : "Non";
                if (activeFieldObj?.fieldType === FieldType.STRING) {
                  const mapping = advFieldMappings[activeAdvField];
                  if (mapping) return Object.keys(mapping).find(key => mapping[key] === Math.round(v)) || v;
                }
                if (activeFieldObj?.fieldType === FieldType.NUMBER) {
                  const isHourly = (activeFieldObj.optionsOrder || []).includes("isHourly");
                  if (isHourly) return formatHourlyValue(v.toString());
                }
                return v;
              };

              return (
                <MuiTooltip
                  key={day.dateStr}
                  title={`${formattedDate} : ${formatVal(day.value)}`}
                  arrow
                >
                  <Box
                    sx={{
                      width: { xs: 26, sm: 32, md: 38 },
                      height: { xs: 26, sm: 32, md: 38 },
                      borderRadius: 2,
                      bgcolor: bg,
                      border: border,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      '&:hover': {
                        transform: "scale(1.15)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        zIndex: 10
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: { xs: 8, md: 10 }, fontWeight: 700, opacity: day.logged ? 0.9 : 0.4, color: day.logged ? "#fff" : "text.secondary" }}>
                      {day.dayNum}
                    </Typography>
                  </Box>
                </MuiTooltip>
              );
            })}
          </Box>

          {/* Color Legend */}
          <Box sx={{ display: "flex", gap: 3, mt: 3, flexWrap: "wrap", justifyContent: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 14, height: 14, borderRadius: 1, border: "1px dashed rgba(0,0,0,0.15)", bgcolor: "rgba(0,0,0,0.03)" }} />
              <Typography variant="caption" color="text.secondary">Pas de données</Typography>
            </Box>

            {activeFieldObj?.fieldType === FieldType.BOOLEAN ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: "#10b981" }} />
                  <Typography variant="caption" color="text.secondary">Oui</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: "#ef4444" }} />
                  <Typography variant="caption" color="text.secondary">Non</Typography>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: activeFieldObj?.fieldType === FieldType.STRING ? "rgba(139, 92, 246, 0.25)" : "rgba(99, 102, 241, 0.25)" }} />
                  <Typography variant="caption" color="text.secondary">Valeur Minime</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: activeFieldObj?.fieldType === FieldType.STRING ? "rgba(139, 92, 246, 0.95)" : "rgba(99, 102, 241, 0.95)" }} />
                  <Typography variant="caption" color="text.secondary">Valeur Maximale</Typography>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
