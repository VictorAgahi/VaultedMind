"use client";

import React from "react";
import { Box, Typography, Tooltip as MuiTooltip } from "@mui/material";

interface CorrelationMatrixProps {
  measurableFields: { id: string, name: string }[];
  matrixData: { x: string, y: string, value: number, color: string, xId: string, yId: string }[];
  activeFieldA: string;
  activeFieldB: string;
  onCellClick: (cell: { xId: string, yId: string, x: string, y: string, value: number, color: string }) => void;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  measurableFields,
  matrixData,
  activeFieldA,
  activeFieldB,
  onCellClick
}) => (
  <Box sx={{
    display: "grid",
    gridTemplateColumns: `repeat(${measurableFields.length}, 1fr)`,
    gap: 1,
    overflowX: "auto",
    pb: 2
  }}>
    {matrixData.map((cell, i) => (
      <MuiTooltip key={`${cell.xId}-${cell.yId}`} title={`${cell.x} vs ${cell.y} : ${cell.value.toFixed(2)}`}>
        <Box
          onClick={() => onCellClick(cell)}
          sx={{
            aspectRatio: "1/1",
            bgcolor: cell.color,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            border: (activeFieldA === cell.xId && activeFieldB === cell.yId) ? "3px solid #142949" : "none",
            "&:hover": { transform: "scale(1.05)", zIndex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }
          }}
        >
          <Typography variant="caption" sx={{ color: Math.abs(cell.value) > 0.5 ? "white" : "text.primary", fontWeight: 800, fontSize: "0.7rem" }}>
            {cell.value.toFixed(1)}
          </Typography>
        </Box>
      </MuiTooltip>
    ))}
  </Box>
);
