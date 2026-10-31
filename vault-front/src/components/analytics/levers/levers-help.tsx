"use client";

import React from "react";
import { Box, Button, Chip, Typography } from "@mui/material";

export type LeversFilter = "all" | "field" | "health" | "notes";

const FILTER_STORAGE_KEY = "vaultedmind:levers-filter";

const FILTERS: Array<{ value: LeversFilter; label: string }> = [
  { value: "all", label: "Tout" },
  { value: "field", label: "Mes champs" },
  { value: "health", label: "Apple Santé" },
  { value: "notes", label: "Lu dans mes notes" },
];

export const readFilterPreference = (): LeversFilter => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    return FILTERS.some((filter) => filter.value === stored) ? (stored as LeversFilter) : "all";
  } catch {
    return "all";
  }
};

export const writeFilterPreference = (value: LeversFilter): void => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, value);
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
};

const HELP_LINES = [
  "Chaque lien indique d'où vient ce qui est comparé : un de tes champs, Apple Santé, ce que l'IA repère dans tes notes, ta façon d'écrire ou la saisie.",
  "« Plus élevé » veut dire : le tiers de tes jours où la valeur est la plus haute, comparé au tiers où elle est la plus basse.",
  "« Solide » : le lien tient même en tenant compte du nombre de comparaisons. « Piste » : possible, à confirmer avec plus de jours.",
  "Un lien n'est pas une cause : deux choses vont ensemble dans tes données, sans qu'on sache laquelle influence l'autre. « Ce qui va avec » regroupe ce qui varie en même temps sans être un levier (humeur, thèmes, façon d'écrire).",
];

export const LeversHelp: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <Box component="section" aria-labelledby="levers-help-toggle" sx={{ display: "grid", gap: 0.5 }}>
      <Button
        id="levers-help-toggle"
        color="inherit"
        aria-expanded={open}
        aria-controls="levers-help-panel"
        onClick={() => setOpen((current) => !current)}
        sx={{ justifySelf: "start", textTransform: "none" }}
      >
        Comment lire ces liens
      </Button>
      {open && (
        <Box id="levers-help-panel" component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 0.5 }}>
          {HELP_LINES.map((line) => (
            <Typography key={line} component="li" variant="body2" color="text.secondary">{line}</Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

export const LeversFilterChips: React.FC<{ value: LeversFilter; onChange: (value: LeversFilter) => void }> = ({ value, onChange }) => (
  <Box role="group" aria-label="Filtrer les liens par origine" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
    {FILTERS.map((filter) => (
      <Chip
        key={filter.value}
        label={filter.label}
        clickable
        aria-pressed={value === filter.value}
        color={value === filter.value ? "primary" : "default"}
        variant={value === filter.value ? "filled" : "outlined"}
        onClick={() => onChange(filter.value)}
      />
    ))}
  </Box>
);
