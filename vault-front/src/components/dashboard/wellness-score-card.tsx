"use client";

import React, { useEffect, useReducer } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { apiService } from "@/services/api.service";
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation } from "@/utils/math";

interface WellnessState {
  fields: CustomField[];
  logs: DailyLog[];
  loading: boolean;
}

type WellnessAction =
  | { type: "LOADED"; fields: CustomField[]; logs: DailyLog[] }
  | { type: "ERROR" };

function wellnessReducer(state: WellnessState, action: WellnessAction): WellnessState {
  switch (action.type) {
    case "LOADED": return { ...state, fields: action.fields, logs: action.logs, loading: false };
    case "ERROR": return { ...state, loading: false };
    default: return state;
  }
}

// Consecutive days with at least one log going back from today
function computeStreak(logs: DailyLog[]): number {
  const logDates = new Set(
    logs.map((l) => new Date(l.logDate).toISOString().split("T")[0])
  );
  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  // If today has no log, start from yesterday
  if (!logDates.has(checkDate.toISOString().split("T")[0])) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  let streak = 0;
  while (logDates.has(checkDate.toISOString().split("T")[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

// Score 0-100 for a subset of logs, using global min/max for normalization
function computeScore(
  weekLogs: DailyLog[],
  allLogs: DailyLog[],
  fields: CustomField[]
): number | null {
  const numericFields = fields.filter(
    (f) => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN
  );
  if (!numericFields.length || !weekLogs.length) return null;

  const fieldStats = new Map<string, { min: number; max: number }>();
  numericFields.forEach((field) => {
    const values = allLogs.flatMap((log) => {
      const v = log.fieldValues?.find((fv) => fv.customFieldId === field.id)?.value;
      if (!v) return [];
      const num = field.fieldType === FieldType.BOOLEAN ? (v === "true" ? 1 : 0) : parseFloat(v);
      return isNaN(num) ? [] : [num];
    });
    if (values.length) fieldStats.set(field.id, { min: Math.min(...values), max: Math.max(...values) });
  });

  let total = 0;
  let count = 0;
  numericFields.forEach((field) => {
    const stats = fieldStats.get(field.id);
    if (!stats || stats.min === stats.max) return;
    const vals = weekLogs.flatMap((log) => {
      const v = log.fieldValues?.find((fv) => fv.customFieldId === field.id)?.value;
      if (!v) return [];
      const num = field.fieldType === FieldType.BOOLEAN ? (v === "true" ? 1 : 0) : parseFloat(v);
      return isNaN(num) ? [] : [num];
    });
    if (!vals.length) return;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    total += (avg - stats.min) / (stats.max - stats.min);
    count++;
  });
  if (!count) return null;
  return Math.round((total / count) * 100);
}

function getWeekBounds(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function findTopCorrelation(
  logs: DailyLog[],
  fields: CustomField[]
): { nameA: string; nameB: string; correlation: number } | null {
  const numericFields = fields.filter(
    (f) => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN
  );
  if (numericFields.length < 2) return null;

  let best: { nameA: string; nameB: string; correlation: number } | null = null;

  for (let i = 0; i < numericFields.length; i++) {
    for (let j = i + 1; j < numericFields.length; j++) {
      const fa = numericFields[i];
      const fb = numericFields[j];
      const pairs = logs.flatMap((log) => {
        const va = log.fieldValues?.find((fv) => fv.customFieldId === fa.id)?.value;
        const vb = log.fieldValues?.find((fv) => fv.customFieldId === fb.id)?.value;
        if (!va || !vb) return [];
        const na = fa.fieldType === FieldType.BOOLEAN ? (va === "true" ? 1 : 0) : parseFloat(va);
        const nb = fb.fieldType === FieldType.BOOLEAN ? (vb === "true" ? 1 : 0) : parseFloat(vb);
        if (isNaN(na) || isNaN(nb)) return [];
        return [{ a: na, b: nb }];
      });
      if (pairs.length < 5) continue;
      const corr = calculatePearsonCorrelation(
        pairs.map((p) => p.a),
        pairs.map((p) => p.b)
      );
      if (!best || Math.abs(corr) > Math.abs(best.correlation)) {
        best = { nameA: fa.name, nameB: fb.name, correlation: corr };
      }
    }
  }
  return best;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Excellent" : score >= 45 ? "Moyen" : "Faible";

  return (
    <Box sx={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      {/* viewBox makes the SVG scale fluidly; max-width caps it on large screens */}
      <Box sx={{ position: "relative", width: { xs: 110, sm: 140 }, height: { xs: 110, sm: 140 } }}>
        <svg
          viewBox="0 0 140 140"
          style={{ width: "100%", height: "100%" }}
        >
          <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            width: "100%",
          }}
        >
          <Typography sx={{ fontWeight: 900, color, lineHeight: 1, fontSize: { xs: "1.6rem", sm: "2.125rem" } }}>
            {score}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "0.6rem" }}>
            /100
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color, mt: 0.5, fontSize: "0.75rem" }}>
        {label}
      </Typography>
    </Box>
  );
}

export function WellnessScoreCard() {
  const [state, dispatch] = useReducer(wellnessReducer, { fields: [], logs: [], loading: true });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiService.get<CustomField[]>("/health/custom-fields", { signal: controller.signal }),
      apiService.get<DailyLog[]>("/health/daily-logs", { signal: controller.signal }),
    ])
      .then(([fields, logs]) => dispatch({ type: "LOADED", fields, logs }))
      .catch(() => dispatch({ type: "ERROR" }));
    return () => controller.abort();
  }, []);

  if (state.loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const { fields, logs } = state;
  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(-1);

  const thisWeekLogs = logs.filter((l) => {
    const d = new Date(l.logDate);
    return d >= thisWeek.start && d <= thisWeek.end;
  });
  const lastWeekLogs = logs.filter((l) => {
    const d = new Date(l.logDate);
    return d >= lastWeek.start && d <= lastWeek.end;
  });

  const thisScore = computeScore(thisWeekLogs, logs, fields);
  const lastScore = computeScore(lastWeekLogs, logs, fields);
  const streak = computeStreak(logs);
  const topCorrelation = findTopCorrelation(logs, fields);

  const delta = thisScore !== null && lastScore !== null ? thisScore - lastScore : null;

  if (thisScore === null) {
    return (
      <Card sx={{ borderRadius: 4, border: "1px solid #e5e7eb", boxShadow: "none", mb: 4, overflow: "hidden" }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Ajoutez des entrées numériques pour voir votre score de bien-être hebdomadaire.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)",
        border: "none",
        mb: 4,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2444 100%)",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <AutoAwesomeIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>
            Score de Bien-être — Cette semaine
          </Typography>
        </Box>

        {/* Main content */}
        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, sm: 4 },
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Score ring */}
          <ScoreRing score={thisScore} />

          {/* Stats */}
          <Stack spacing={2} sx={{ flex: 1, minWidth: 160 }}>
            {/* Streak */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: "rgba(245,158,11,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LocalFireDepartmentIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "white", lineHeight: 1 }}>
                  {streak} jour{streak !== 1 ? "s" : ""}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                  Série en cours
                </Typography>
              </Box>
            </Box>

            {/* Delta vs last week */}
            {delta !== null && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: delta >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {delta > 0 ? (
                    <TrendingUpIcon sx={{ color: "#10b981", fontSize: 20 }} />
                  ) : delta < 0 ? (
                    <TrendingDownIcon sx={{ color: "#ef4444", fontSize: 20 }} />
                  ) : (
                    <TrendingFlatIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  )}
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 900,
                      color: delta >= 0 ? "#10b981" : "#ef4444",
                      lineHeight: 1,
                    }}
                  >
                    {delta > 0 ? "+" : ""}{delta} pts
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                    vs semaine dernière
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Entries this week */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={`${thisWeekLogs.length} entrée${thisWeekLogs.length !== 1 ? "s" : ""} cette semaine`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Auto-discovered insight */}
        {topCorrelation && Math.abs(topCorrelation.correlation) > 0.4 && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.65rem" }}>
              Corrélation découverte
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 500, mt: 0.5, lineHeight: 1.5 }}>
              {topCorrelation.correlation > 0
                ? `Quand ton ${topCorrelation.nameA.toLowerCase()} augmente, ton ${topCorrelation.nameB.toLowerCase()} tend aussi à augmenter`
                : `Ton ${topCorrelation.nameA.toLowerCase()} et ton ${topCorrelation.nameB.toLowerCase()} évoluent en sens inverse`}
              {" "}
              <Box component="span" sx={{ color: "#10b981", fontWeight: 700 }}>
                (r = {topCorrelation.correlation.toFixed(2)})
              </Box>
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
