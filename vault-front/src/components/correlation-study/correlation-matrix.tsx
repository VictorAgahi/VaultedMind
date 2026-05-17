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
}) => {
  const fieldCount = measurableFields.length;

  // Progressive shrinking on mobile (> 6 fields) to avoid breaking layout
  const getMobileCellSize = () => {
    if (fieldCount <= 6) return "45px";
    if (fieldCount === 7) return "38px";
    if (fieldCount === 8) return "32px";
    return "26px";
  };

  const getDesktopCellSize = () => {
    if (fieldCount <= 6) return "45px";
    if (fieldCount === 7) return "42px";
    if (fieldCount === 8) return "38px";
    return "34px";
  };

  const getCellFontSize = () => {
    if (fieldCount <= 6) return "0.7rem";
    if (fieldCount === 7) return "0.62rem";
    if (fieldCount === 8) return "0.55rem";
    return "0.48rem";
  };

  const getHeaderFontSize = () => {
    if (fieldCount <= 6) return "0.7rem";
    if (fieldCount === 7) return "0.65rem";
    if (fieldCount === 8) return "0.58rem";
    return "0.52rem";
  };

  const getColHeaderFontSize = () => {
    if (fieldCount <= 6) return "0.65rem";
    if (fieldCount === 7) return "0.58rem";
    if (fieldCount === 8) return "0.52rem";
    return "0.46rem";
  };

  const mobileCellSize = getMobileCellSize();
  const desktopCellSize = getDesktopCellSize();
  const cellFontSize = getCellFontSize();
  const headerFontSize = getHeaderFontSize();
  const colHeaderFontSize = getColHeaderFontSize();

  return (
    <Box sx={{ overflowX: "auto", width: "100%", pb: 2 }}>
      <Box sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `auto repeat(${fieldCount}, minmax(${mobileCellSize}, 1fr))`,
          sm: `auto repeat(${fieldCount}, minmax(${desktopCellSize}, 1fr))`
        },
        gap: { xs: 0.5, sm: 1 },
        minWidth: "max-content"
      }}>
        <Box /> {/* Top-left empty cell */}

        {/* Column Headers */}
        {measurableFields.map(f => (
          <Box key={`col-${f.id}`} sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", pb: 1, minHeight: { xs: fieldCount <= 6 ? 60 : 50, sm: 60 } }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: { xs: colHeaderFontSize, sm: "0.65rem" }, transform: "rotate(-45deg)", transformOrigin: "bottom left", whiteSpace: "nowrap", color: "text.secondary" }}>
              {f.name.length > 15 ? f.name.substring(0, 15) + "..." : f.name}
            </Typography>
          </Box>
        ))}

        {/* Rows */}
        {measurableFields.map((rowField) => (
          <React.Fragment key={`row-${rowField.id}`}>
            {/* Row Header */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 1, minWidth: { xs: fieldCount <= 6 ? 80 : 60, sm: 80 } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: { xs: headerFontSize, sm: "0.7rem" }, textAlign: "right", color: "text.secondary", whiteSpace: "nowrap" }}>
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
                      borderRadius: fieldCount <= 6 ? 2 : 1,
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
                    <Typography variant="caption" sx={{ color: Math.abs(cell.value) > 0.5 ? "white" : "text.primary", fontWeight: 800, fontSize: { xs: cellFontSize, sm: "0.7rem" }, whiteSpace: "nowrap", lineHeight: 1 }}>
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
};
