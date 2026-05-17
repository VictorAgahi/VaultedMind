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
  <Box sx={{ overflowX: "auto", width: "100%", pb: 2 }}>
    <Box sx={{
      display: "grid",
      gridTemplateColumns: `auto repeat(${measurableFields.length}, minmax(45px, 1fr))`,
      gap: 1,
      minWidth: "max-content"
    }}>
      <Box /> {/* Top-left empty cell */}

      {/* Column Headers */}
      {measurableFields.map(f => (
        <Box key={`col-${f.id}`} sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", pb: 1, minHeight: 60 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", transform: "rotate(-45deg)", transformOrigin: "bottom left", whiteSpace: "nowrap", color: "text.secondary" }}>
            {f.name.length > 15 ? f.name.substring(0, 15) + "..." : f.name}
          </Typography>
        </Box>
      ))}

      {/* Rows */}
      {measurableFields.map((rowField) => (
        <React.Fragment key={`row-${rowField.id}`}>
          {/* Row Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 1, minWidth: 80 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.7rem", textAlign: "right", color: "text.secondary", whiteSpace: "nowrap" }}>
              {rowField.name.length > 15 ? rowField.name.substring(0, 15) + "..." : rowField.name}
            </Typography>
          </Box>

          {/* Cells */}
          {measurableFields.map((colField) => {
            const cell = matrixData.find(c => c.xId === rowField.id && c.yId === colField.id);
            if (!cell) return <Box key={`empty-${colField.id}`} />;
            return (
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
                    boxShadow: (activeFieldA === cell.xId && activeFieldB === cell.yId) ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                    transform: (activeFieldA === cell.xId && activeFieldB === cell.yId) ? "scale(1.05)" : "none",
                    "&:hover": { transform: "scale(1.05)", zIndex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }
                  }}
                >
                  <Typography variant="caption" sx={{ color: Math.abs(cell.value) > 0.5 ? "white" : "text.primary", fontWeight: 800, fontSize: "0.7rem" }}>
                    {cell.value.toFixed(1)}
                  </Typography>
                </Box>
              </MuiTooltip>
            );
          })}
        </React.Fragment>
      ))}
    </Box>
  </Box>
);
