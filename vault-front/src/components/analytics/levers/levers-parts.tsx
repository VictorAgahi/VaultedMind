"use client";

import React from "react";
import Link from "next/link";
import { Box, Button, Chip, Link as MuiLink, Paper, Tooltip, Typography } from "@mui/material";
import type { PatternStrength } from "@/types";

export const MAX_VISIBLE_CARDS = 5;

const STRENGTH_EXPLANATION: Record<PatternStrength, string> = {
  solide: "Le lien tient même en tenant compte du nombre de comparaisons faites.",
  piste: "À confirmer avec plus de jours : ce lien est possible, mais pas encore assez net.",
};

export const StrengthChip: React.FC<{ strength: PatternStrength }> = ({ strength }) => (
  <Tooltip title={STRENGTH_EXPLANATION[strength]} enterTouchDelay={0} leaveTouchDelay={4000}>
    <Chip
      size="small"
      tabIndex={0}
      label={strength === "solide" ? "Solide" : "Piste"}
      variant={strength === "solide" ? "filled" : "outlined"}
      color={strength === "solide" ? "primary" : "default"}
      aria-label={`${strength === "solide" ? "Solide" : "Piste"} : ${STRENGTH_EXPLANATION[strength]}`}
    />
  </Tooltip>
);

export const formatDay = (isoDate: string): string =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const DayLinks: React.FC<{ dates: string[]; label?: string }> = ({ dates, label = "Jours en exemple :" }) => {
  if (dates.length === 0) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "baseline" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {dates.map((date) => (
        <MuiLink
          key={date}
          component={Link}
          href={`/dashboard?date=${date}`}
          variant="caption"
          underline="always"
          sx={{ minHeight: 24, display: "inline-flex", alignItems: "center" }}
        >
          {formatDay(date)}
        </MuiLink>
      ))}
    </Box>
  );
};

// Carte neutre : pas de rouge ni de ton d'alerte, la différence tient à la bordure seulement.
export const InsightCard: React.FC<{ tone: "help" | "neutral"; children: React.ReactNode }> = ({ tone, children }) => (
  <Paper
    variant="outlined"
    component="li"
    sx={{
      p: 1.5,
      borderRadius: 3,
      display: "grid",
      gap: 1,
      listStyle: "none",
      borderLeft: "4px solid",
      borderLeftColor: tone === "help" ? "primary.main" : "divider",
      bgcolor: tone === "help" ? "background.paper" : "action.hover",
    }}
  >
    {children}
  </Paper>
);

interface ShowMoreListProps<T> {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
  limit?: number;
}

export function ShowMoreList<T>({ items, render, limit = MAX_VISIBLE_CARDS }: ShowMoreListProps<T>): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box component="ul" sx={{ m: 0, p: 0, display: "grid", gap: 1 }}>
        {visible.map((item, index) => render(item, index))}
      </Box>
      {items.length > limit && (
        <Button size="small" color="inherit" onClick={() => setExpanded((current) => !current)} sx={{ justifySelf: "start" }}>
          {expanded ? "Voir moins" : `Voir plus (${items.length - limit})`}
        </Button>
      )}
    </Box>
  );
}

export const SectionTitle: React.FC<{ id: string; title: string; subtitle?: string; level?: "h5" | "h6" }> = ({
  id,
  title,
  subtitle,
  level = "h5",
}) => (
  <Box>
    <Typography id={id} variant={level} component="h2">{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Box>
);
