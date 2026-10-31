"use client";

import React from "react";
import { Box, Paper, Typography } from "@mui/material";

interface SettingsBlockProps {
  title?: string;
  description?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}

// Un réglage = une carte. Les éditeurs qui portent déjà leur titre s'utilisent sans `title`.
export const SettingsBlock: React.FC<SettingsBlockProps> = ({ title, description, id, children }) => (
  <Paper
    component="section"
    id={id}
    sx={{
      p: 2,
      borderRadius: 4,
      scrollMarginTop: 80,
      minWidth: 0,
      // Les éditeurs réutilisés ajoutent une marge haute pensée pour une liste : inutile en tête de carte.
      "& > :first-of-type": { mt: 0 },
    }}
  >
    {(title || description) && (
      <Box sx={{ mb: 1.5 }}>
        {title && <Typography variant="subtitle1" component="h2">{title}</Typography>}
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
    )}
    {children}
  </Paper>
);
