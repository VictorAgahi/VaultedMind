/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { CustomField, DailyLog, FieldType } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import { ChartCard, ChartEmpty } from "./chart-card";
import { axisTick, chartColors, chartTooltipProps } from "@/theme/chart-tokens";
import { formatHourlyValue } from "@/utils/time-converter";

interface HabitImpactStudyProps {
  fields: CustomField[];
  logs: DailyLog[];
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number, fullHeight?: boolean }>;
}

export const HabitImpactStudy: React.FC<HabitImpactStudyProps> = ({
  fields,
  logs,
  ChartContainer
}) => {

  // Boolean fields represent habits
  const habitFields = useMemo(() => 
    fields.filter(f => f.fieldType === FieldType.BOOLEAN && f.isActive),
    [fields]
  );

  // Number fields represent metrics to observe
  const metricFields = useMemo(() => 
    fields.filter(f => f.fieldType === FieldType.NUMBER && f.isActive),
    [fields]
  );

  const [selectedHabitId, setSelectedHabitId] = useState<string>(() => habitFields[0]?.id || "");
  const [selectedMetricId, setSelectedMetricId] = useState<string>(() => metricFields[0]?.id || "");

  const activeHabit = useMemo(() => fields.find(f => f.id === selectedHabitId), [fields, selectedHabitId]);
  const activeMetric = useMemo(() => fields.find(f => f.id === selectedMetricId), [fields, selectedMetricId]);

  // Compute stats comparing days with habit vs days without habit
  const comparisonStats = useMemo(() => {
    if (!selectedHabitId || !selectedMetricId || !logs.length) return null;

    const withHabitValues: number[] = [];
    const withoutHabitValues: number[] = [];

    logs.forEach(log => {
      const habitFv = log.fieldValues?.find(fv => fv.customFieldId === selectedHabitId);
      const metricFv = log.fieldValues?.find(fv => fv.customFieldId === selectedMetricId);

      if (habitFv && habitFv.value && metricFv && metricFv.value && metricFv.value !== "-") {
        const hasHabit = habitFv.value === "true";
        const val = parseFloat(metricFv.value);
        if (!isNaN(val)) {
          if (hasHabit) {
            withHabitValues.push(val);
          } else {
            withoutHabitValues.push(val);
          }
        }
      }
    });

    const avgWith = withHabitValues.length > 0 ? withHabitValues.reduce((a, b) => a + b, 0) / withHabitValues.length : 0;
    const avgWithout = withoutHabitValues.length > 0 ? withoutHabitValues.reduce((a, b) => a + b, 0) / withoutHabitValues.length : 0;
    const diff = avgWith - avgWithout;
    const percentChange = avgWithout !== 0 ? (diff / avgWithout) * 100 : 0;

    return {
      avgWith: parseFloat(avgWith.toFixed(2)),
      avgWithout: parseFloat(avgWithout.toFixed(2)),
      diff: parseFloat(diff.toFixed(2)),
      percentChange: parseFloat(percentChange.toFixed(1)),
      countWith: withHabitValues.length,
      countWithout: withoutHabitValues.length
    };
  }, [logs, selectedHabitId, selectedMetricId]);

  // Data formatted for standard Recharts comparison BarChart
  const chartData = useMemo(() => {
    if (!comparisonStats) return [];
    return [
      { name: "Sans", Valeur: comparisonStats.avgWithout, count: comparisonStats.countWithout },
      { name: "Avec", Valeur: comparisonStats.avgWith, count: comparisonStats.countWith },
    ];
  }, [comparisonStats]);

  if (habitFields.length === 0 || metricFields.length === 0) {
    return (
      <Box>
        <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            Pas assez de données pour l&apos;étude d&apos;impact des habitudes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Il vous faut au moins 1 champ Booléen (Habitude) et 1 champ Numérique (Mesure) actif pour analyser les impacts.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const isHourly = activeMetric && (activeMetric.optionsOrder || []).includes("isHourly");
  const metricName = activeMetric?.name || "";
  const habitName = activeHabit?.name || "";

  const fmt = (v: number) => (isHourly ? formatHourlyValue(v.toString()) : String(v).replace(".", ","));
  const higher = comparisonStats ? comparisonStats.diff >= 0 : true;
  // Sans assez de jours de chaque côté, l'écart n'a pas de sens : on le dit au lieu d'afficher un faux chiffre.
  const MIN_DAYS_PER_GROUP = 5;
  const enoughData = !!comparisonStats
    && comparisonStats.countWith >= MIN_DAYS_PER_GROUP
    && comparisonStats.countWithout >= MIN_DAYS_PER_GROUP;
  const notEnoughMessage = comparisonStats
    ? `Pour comparer, il faut au moins ${MIN_DAYS_PER_GROUP} jours avec ${habitName} et ${MIN_DAYS_PER_GROUP} jours sans. Pour l'instant : ${comparisonStats.countWith} avec, ${comparisonStats.countWithout} sans.`
    : "Données insuffisantes.";

  return (
    <Grid container spacing={{ xs: 1.5, md: 3 }}>
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 280px 280px" }, alignItems: "center" }}>
          <Box>
            <Typography variant="h5" component="h2">Impact d&apos;une habitude</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Comparez une mesure les jours avec et sans une habitude (oui / non).
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Habitude</InputLabel>
            <Select value={selectedHabitId} label="Habitude" onChange={(e) => setSelectedHabitId(e.target.value)}>
              {habitFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Mesure</InputLabel>
            <Select value={selectedMetricId} label="Mesure" onChange={(e) => setSelectedMetricId(e.target.value)}>
              {metricFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, height: "100%", display: "grid", gap: 2, alignContent: "start" }}>
          <Typography variant="h5" component="h2">Écart moyen</Typography>
          {comparisonStats && enoughData ? (
            <>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.75rem", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                  {comparisonStats.diff >= 0 ? "+" : ""}{fmt(comparisonStats.diff)}
                </Typography>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 999, bgcolor: "action.hover", color: "text.secondary" }}>
                  {higher ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />}
                  <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {comparisonStats.diff >= 0 ? "+" : ""}{comparisonStats.percentChange} %
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Les jours avec <strong>{habitName}</strong>, la moyenne de <strong>{metricName}</strong> est {higher ? "plus élevée" : "plus basse"}.
                Un écart ne prouve pas une cause : c&apos;est une piste à observer.
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                {[
                  { label: `Sans ${habitName}`, value: comparisonStats.avgWithout, count: comparisonStats.countWithout, color: "var(--chart-neutral)" },
                  { label: `Avec ${habitName}`, value: comparisonStats.avgWith, count: comparisonStats.countWith, color: "var(--chart-s1)" },
                ].map((item) => (
                  <Box key={item.label} sx={{ p: 1.5, borderRadius: 3, bgcolor: "action.hover", display: "grid", gap: 0.5, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                      <Box sx={{ width: 10, height: 10, flex: "none", borderRadius: "3px", bgcolor: item.color }} />
                      <Typography variant="caption" color="text.secondary" noWrap>{item.label}</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(item.value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.count} jours</Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">{notEnoughMessage}</Typography>
          )}
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <ChartCard title="Comparaison" subtitle={`Moyenne de ${metricName} selon l'habitude.`} help="Compare la moyenne de la mesure les jours sans l'habitude (gris) et les jours avec (sceau).">
          {!enoughData ? (
            <ChartEmpty>{notEnoughMessage}</ChartEmpty>
          ) : (
          <ChartContainer aspect={1.8} minHeight={260}>
            <BarChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="name" axisLine={{ stroke: chartColors.axis }} tickLine={false} tick={{ ...axisTick, fill: chartColors.ink }} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} width={40} tickCount={4} tickFormatter={(v) => fmt(Number(v))} />
              <Tooltip
                {...chartTooltipProps}
                cursor={{ fill: "var(--mui-palette-action-hover)" }}
                formatter={(val: any) => [fmt(Number(val)), metricName]}
              />
              <Bar dataKey="Valeur" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.name === "Avec" ? chartColors.primary : chartColors.neutral} />
                ))}
                <LabelList dataKey="Valeur" position="top" formatter={(v: any) => fmt(Number(v))} style={{ fill: chartColors.ink, fontSize: 12, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ChartContainer>
          )}
        </ChartCard>
      </Grid>
    </Grid>
  );
};
