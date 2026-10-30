"use client";

import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { CustomField, DailyLog } from "@/types";
import { formatHourlyValue } from "@/utils/time-converter";
import { GoalProgress, hasSustainedLowMood, weeklyGoalProgress, weeklySummary } from "@/utils/wellbeing";
import { CrisisResources } from "@/components/support/crisis-resources";

interface WellbeingCardsProps {
  logs: DailyLog[];
  fields: CustomField[];
  moodField?: CustomField;
}

const shortDay = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });

const formatNumber = (value: number): string => String(Math.round(value * 10) / 10).replace(".", ",");

const isHourly = (field: CustomField): boolean => (field.optionsOrder ?? []).includes("isHourly");

// Le signal de baisse se masque pour la semaine une fois fermé : jamais insistant.
const TREND_DISMISS_KEY = "vaultedmind:trend-dismissed-week";
const currentWeekKey = (): string => String(Math.floor(Date.now() / (7 * 86_400_000)));

const GoalRing: React.FC<{ progress: GoalProgress }> = ({ progress }) => {
  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <Box component="svg" viewBox={`0 0 ${size} ${size}`} sx={{ width: size, height: size, flex: "none" }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--mui-palette-divider)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progress.reached ? "var(--chart-s1)" : "var(--accent-strong)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * progress.ratio} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Box>
  );
};

export const WellbeingCards: React.FC<WellbeingCardsProps> = ({ logs, fields, moodField }) => {
  const summary = React.useMemo(() => weeklySummary(logs, fields, moodField), [logs, fields, moodField]);
  const lowMood = React.useMemo(() => hasSustainedLowMood(logs, moodField), [logs, moodField]);
  const goals = React.useMemo(() => weeklyGoalProgress(logs, fields), [logs, fields]);
  const [trendDismissed, setTrendDismissed] = React.useState(() => {
    try {
      return localStorage.getItem(TREND_DISMISS_KEY) === currentWeekKey();
    } catch {
      return false;
    }
  });

  const dismissTrend = () => {
    setTrendDismissed(true);
    try {
      localStorage.setItem(TREND_DISMISS_KEY, currentWeekKey());
    } catch {
      // Stockage indisponible : la carte réapparaîtra au prochain chargement.
    }
  };

  if (!summary && !(lowMood && !trendDismissed) && goals.length === 0) return null;

  const moodDelta = summary?.moodAverage != null && summary.moodPreviousAverage != null
    ? summary.moodAverage - summary.moodPreviousAverage
    : null;

  return (
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fit, minmax(320px, 1fr))" } }}>
      {lowMood && !trendDismissed && (
        <Paper component="section" aria-labelledby="trend-title" sx={{ p: 2.5, borderRadius: 4, display: "grid", gap: 1.5, gridColumn: "1 / -1" }}>
          <Typography id="trend-title" variant="h5" component="h2">Ces derniers jours semblent plus lourds</Typography>
          <Typography variant="body2" color="text.secondary">
            Votre humeur est plus basse que d&apos;habitude depuis quelques jours. Prendre l&apos;air, écrire ce qui pèse ou en parler à un proche peut aider. Si cela dure, un professionnel peut vous accompagner.
          </Typography>
          <CrisisResources compact />
          <Button onClick={dismissTrend} color="inherit" sx={{ justifySelf: "start" }}>Masquer cette semaine</Button>
        </Paper>
      )}

      {summary && (
        <Paper component="section" aria-labelledby="week-title" sx={{ p: 2.5, borderRadius: 4, display: "grid", gap: 1.5, alignContent: "start" }}>
          <Box>
            <Typography id="week-title" variant="h5" component="h2">Votre semaine</Typography>
            <Typography variant="body2" color="text.secondary">
              {summary.daysLogged} jour{summary.daysLogged > 1 ? "s" : ""} noté{summary.daysLogged > 1 ? "s" : ""} sur les 7 derniers
            </Typography>
          </Box>
          {moodField && summary.moodAverage !== null && (
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {formatNumber(summary.moodAverage)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {moodField.name.toLowerCase()} moyenne
                {moodDelta !== null && Math.abs(moodDelta) >= 0.1 && ` (${moodDelta > 0 ? "+" : ""}${formatNumber(moodDelta)} par rapport à la semaine d'avant)`}
              </Typography>
            </Box>
          )}
          {summary.bestDay && (
            <Typography variant="body2">
              <strong>Meilleur jour :</strong> {shortDay(summary.bestDay.date)}
              {summary.bestDay.note && <Box component="span" sx={{ color: "text.secondary" }}>, « {summary.bestDay.note.slice(0, 80)}{summary.bestDay.note.length > 80 ? "…" : ""} »</Box>}
            </Typography>
          )}
          {summary.hardestDay && (
            <Typography variant="body2">
              <strong>Jour plus difficile :</strong> {shortDay(summary.hardestDay.date)}
            </Typography>
          )}
          {summary.mostRegularHabit && (
            <Typography variant="body2">
              <strong>Habitude la plus régulière :</strong> {summary.mostRegularHabit.name}, {summary.mostRegularHabit.days} jour{summary.mostRegularHabit.days > 1 ? "s" : ""}
            </Typography>
          )}
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "primary.light" }}>
            <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>À méditer</Typography>
            <Typography variant="body2">{summary.reflection}</Typography>
          </Box>
        </Paper>
      )}

      {goals.length > 0 && (
        <Paper component="section" aria-labelledby="goals-title" sx={{ p: 2.5, borderRadius: 4, display: "grid", gap: 1.5, alignContent: "start" }}>
          <Box>
            <Typography id="goals-title" variant="h5" component="h2">Objectifs de la semaine</Typography>
            <Typography variant="body2" color="text.secondary">Depuis lundi. Sans pression : c&apos;est un repère.</Typography>
          </Box>
          {goals.map((progress) => {
            const atMost = progress.field.goalDirection === "AT_MOST";
            const format = (v: number) => (isHourly(progress.field) ? formatHourlyValue(String(v)) : formatNumber(v));
            const text = progress.unit === "days"
              ? `${progress.current} jour${progress.current > 1 ? "s" : ""} sur ${atMost ? "au plus " : ""}${progress.target}`
              : `Moyenne ${format(progress.current)}, objectif ${atMost ? "au plus" : "au moins"} ${format(progress.target)}`;
            return (
              <Box key={progress.field.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <GoalRing progress={progress} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{progress.field.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text}{progress.reached ? ", atteint" : ""}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
};
