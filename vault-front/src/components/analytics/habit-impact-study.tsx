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
  Tooltip as MuiTooltip
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { CustomField, DailyLog, FieldType } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
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
      {
        name: "Sans l'habitude",
        Valeur: comparisonStats.avgWithout,
        color: "#94a3b8"
      },
      {
        name: "Avec l'habitude",
        Valeur: comparisonStats.avgWith,
        color: "#6366f1"
      }
    ];
  }, [comparisonStats]);

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

  if (habitFields.length === 0 || metricFields.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Paper elevation={0} sx={{ p: 6, borderRadius: 6, textAlign: "center", border: "1px solid rgba(0,0,0,0.05)" }}>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
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

  return (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        {/* Selection panel */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
            <Grid container spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CompareArrowsIcon sx={{ color: "#6366f1" }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Impact des Habitudes sur vos Mesures</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Comparez scientifiquement l&apos;impact de vos habitudes (Oui/Non) sur vos indicateurs de santé.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Habitude (Champ Booléen)</InputLabel>
                  <Select
                    value={selectedHabitId}
                    label="Habitude (Champ Booléen)"
                    onChange={(e) => setSelectedHabitId(e.target.value)}
                    sx={{ borderRadius: 3 }}
                  >
                    {habitFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Mesure (Champ Numérique)</InputLabel>
                  <Select
                    value={selectedMetricId}
                    label="Mesure (Champ Numérique)"
                    onChange={(e) => setSelectedMetricId(e.target.value)}
                    sx={{ borderRadius: 3 }}
                  >
                    {metricFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Left Card: Averages and Net Impact Analysis */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={refinedPaperStyle}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Analyse d&apos;Impact Net</Typography>

            {comparisonStats ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1, justifyContent: "center" }}>
                <Grid container spacing={2}>
                  {/* Without Habit Card */}
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ p: 2.5, bgcolor: "rgba(148, 163, 184, 0.05)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 4, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 1 }}>Sans {habitName}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: "text.primary" }}>
                        {isHourly ? formatHourlyValue(comparisonStats.avgWithout.toString()) : comparisonStats.avgWithout}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{comparisonStats.countWithout} jours</Typography>
                    </Box>
                  </Grid>

                  {/* With Habit Card */}
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ p: 2.5, bgcolor: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.12)", borderRadius: 4, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 1 }}>Avec {habitName}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: "#6366f1" }}>
                        {isHourly ? formatHourlyValue(comparisonStats.avgWith.toString()) : comparisonStats.avgWith}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{comparisonStats.countWith} jours</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Scorecard banner with green / red depending on impact */}
                <Box sx={{ 
                  p: 3, 
                  bgcolor: comparisonStats.diff >= 0 ? "rgba(16, 185, 129, 0.05)" : "rgba(244, 63, 94, 0.05)", 
                  border: comparisonStats.diff >= 0 ? "1px dashed rgba(16, 185, 129, 0.25)" : "1px dashed rgba(244, 63, 94, 0.25)",
                  borderRadius: 4,
                  textAlign: "center"
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
                    {comparisonStats.diff >= 0 ? (
                      <ThumbUpIcon sx={{ color: "#10b981" }} />
                    ) : (
                      <ThumbDownIcon sx={{ color: "#f43f5e" }} />
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: comparisonStats.diff >= 0 ? "#0f766e" : "#be123c" }}>
                      {comparisonStats.diff >= 0 ? "Influence Positive" : "Influence Négative"}
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: comparisonStats.diff >= 0 ? "#10b981" : "#f43f5e", mb: 1 }}>
                    {comparisonStats.diff >= 0 ? "+" : ""}{isHourly ? formatHourlyValue(comparisonStats.diff.toString()) : comparisonStats.diff}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    L&apos;activité <strong>{habitName}</strong> est associée à une variation de <strong>{comparisonStats.diff >= 0 ? "+" : ""}{comparisonStats.percentChange}%</strong> sur votre indicateur <strong>{metricName}</strong>.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">Données insuffisantes.</Typography>
            )}
          </Paper>
        </Grid>

        {/* Right Card: Comparative BarChart */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={refinedPaperStyle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Visualisation de la Différence</Typography>
                <Typography variant="body2" color="text.secondary">Comparatif des moyennes absolues</Typography>
              </Box>
              <MuiTooltip title="Ce diagramme à barres compare la moyenne de votre mesure lorsque l'habitude est désactivée (grise) par rapport à lorsqu'elle est activée (indigo).">
                <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
              </MuiTooltip>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 300, display: "flex", alignItems: "center" }}>
              <ChartContainer aspect={1.5} mobileAspect={1.1} minHeight={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                    formatter={(val: any) => {
                      if (isHourly) return [formatHourlyValue(val.toString()), metricName];
                      return [val, metricName];
                    }}
                  />
                  <Bar 
                    dataKey="Valeur" 
                    radius={6} 
                    barSize={40}
                    fill="#6366f1"
                  />
                </BarChart>
              </ChartContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
