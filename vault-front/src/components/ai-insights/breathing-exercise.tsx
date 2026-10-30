"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

const PHASES = [
  { label: "Inspirez", seconds: 4, scale: 1 },
  { label: "Retenez", seconds: 4, scale: 1 },
  { label: "Expirez", seconds: 6, scale: 0.6 },
] as const;

// Respiration guidée 4-4-6 pendant que le bilan se prépare : quelques secondes utiles plutôt qu'un écran d'attente.
export const BreathingExercise: React.FC = () => {
  const [phaseIndex, setPhaseIndex] = React.useState(0);
  const phase = PHASES[phaseIndex];

  React.useEffect(() => {
    const timer = setTimeout(() => setPhaseIndex((i) => (i + 1) % PHASES.length), phase.seconds * 1000);
    return () => clearTimeout(timer);
  }, [phase.seconds]);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 4, bgcolor: "background.paper", display: "grid", justifyItems: "center", gap: 2, textAlign: "center" }}
    >
      <Typography variant="subtitle1">Votre bilan se prépare. Respirons un instant.</Typography>
      <Box sx={{ width: 140, height: 140, display: "grid", placeItems: "center" }}>
        <Box
          aria-hidden
          sx={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            bgcolor: "primary.light",
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.label === "Retenez" ? 0 : phase.seconds}s ease-in-out`,
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        />
      </Box>
      <Typography variant="h3" component="p" sx={{ color: "primary.main" }}>{phase.label}</Typography>
      <Typography variant="caption" color="text.secondary">Cela prend en général moins d&apos;une minute.</Typography>
    </Box>
  );
};
