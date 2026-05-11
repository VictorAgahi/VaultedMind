"use client";

import React from "react";
import { Box, Typography, Paper, Tooltip as MuiTooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

interface CorrelationMatrixProps {
  matrix: any[];
  activeFields: any[];
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ matrix, activeFields }) => {
  const getCellColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs > 0.7) return value > 0 ? "rgba(5, 150, 105, 0.8)" : "rgba(220, 38, 38, 0.8)";
    if (abs > 0.4) return value > 0 ? "rgba(5, 150, 105, 0.4)" : "rgba(220, 38, 38, 0.4)";
    if (abs > 0.2) return value > 0 ? "rgba(5, 150, 105, 0.15)" : "rgba(220, 38, 38, 0.15)";
    return "transparent";
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 6, overflowX: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Matrice de Corrélation</Typography>
        <MuiTooltip title="Indique la force du lien entre deux mesures (-1 à 1). 1 = Corrélation positive forte, -1 = Corrélation négative forte.">
          <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
        </MuiTooltip>
      </Box>
      <Box sx={{ minWidth: 600 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: `150px repeat(${activeFields.length}, 1fr)`, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <Box />
          {activeFields.map(f => (
            <Box key={f.id} sx={{ p: 1, textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}>{f.name}</Typography>
            </Box>
          ))}
        </Box>
        {matrix.map((row, i) => (
          <Box key={activeFields[i].id} sx={{ display: "grid", gridTemplateColumns: `150px repeat(${activeFields.length}, 1fr)`, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <Box sx={{ p: 1, display: "flex", alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{activeFields[i].name}</Typography>
            </Box>
            {row.map((val: number, j: number) => (
              <Box key={activeFields[j].id} sx={{ p: 1, textAlign: "center", bgcolor: getCellColor(val), display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                <Typography variant="body2" sx={{ fontWeight: Math.abs(val) > 0.4 ? 700 : 400, color: Math.abs(val) > 0.6 ? "#fff" : "inherit" }}>
                  {val.toFixed(2)}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
