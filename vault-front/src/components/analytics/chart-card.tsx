"use client";

import React from "react";
import { Box, Paper, Typography, Tooltip, IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  help?: string;
  // Sélecteur de champ ou filtres, placés sous le titre en pleine largeur sur mobile.
  controls?: React.ReactNode;
  children: React.ReactNode;
}

// Carte commune aux graphiques : surface sans bordure, titre court, contrôles au-dessus du tracé.
export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, help, controls, children }) => (
  <Paper sx={{ borderRadius: 4, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <Box sx={{ p: { xs: 2, md: 3 }, pb: { xs: 1, md: 1.5 }, display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h2">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {help && (
          <Tooltip title={help} enterTouchDelay={0} leaveTouchDelay={4000}>
            <IconButton aria-label={`Aide : ${title}`} sx={{ mt: -1, mr: -1, color: "text.disabled" }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {controls}
    </Box>
    <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", px: { xs: 0.5, md: 1.5 }, pb: { xs: 1.5, md: 2 } }}>
      {children}
    </Box>
  </Paper>
);

export const ChartEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: "grid", placeItems: "center", minHeight: 200, px: 2, textAlign: "center" }}>
    <Typography variant="body2" color="text.secondary">{children}</Typography>
  </Box>
);
