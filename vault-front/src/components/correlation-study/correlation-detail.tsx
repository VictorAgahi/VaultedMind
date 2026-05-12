"use client";

import React from "react";
import { Box, Typography, IconButton, Fade } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getCorrelationColor } from "@/utils/math";

import { CustomField } from "@/types";

interface CorrelationDetailProps {
  activeCell: { x: string, y: string, value: number, color: string, xId: string, yId: string } | null;
  onClose: () => void;
  getInterpretation: (val: number, nameA: string, nameB: string) => string;
  currentCorrelation: number;
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, minHeight: number }>;
  scatterData: { x: number, y: number, date: string }[];
  activeFieldA: string;
  activeFieldB: string;
  measurableFields: CustomField[];
  formatVal: (val: number | string | null, id: string) => string | number;
}

export const CorrelationDetail: React.FC<CorrelationDetailProps> = ({
  activeCell,
  onClose,
  getInterpretation,
  currentCorrelation,
  ChartContainer,
  scatterData,
  activeFieldA,
  activeFieldB,
  measurableFields,
  formatVal
}) => (
  <Fade in={!!activeCell} timeout={400}>
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Détail du lien</Typography>
        <IconButton size="small" onClick={onClose} sx={{ bgcolor: "grey.50" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: activeCell?.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "1.2rem" }}>
          {activeCell?.value.toFixed(2)}
        </Box>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 800 }}>{activeCell?.x}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>vs</Typography>
          <Typography variant="body1" sx={{ fontWeight: 800 }}>{activeCell?.y}</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ lineHeight: 1.6, color: "text.secondary", bgcolor: "grey.50", p: 2.5, borderRadius: 4, border: "1px solid rgba(0,0,0,0.03)", mb: 4 }}>
        {activeCell && getInterpretation(activeCell.value, activeCell.x, activeCell.y)}
      </Typography>

      <Box sx={{ textAlign: "center", mb: 4, p: 3, bgcolor: "rgba(99, 102, 241, 0.05)", borderRadius: 4, border: "1px solid rgba(99, 102, 241, 0.1)" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Coefficient r</Typography>
        <Typography variant="h2" sx={{ fontWeight: 900, color: getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "1)") }}>
          {currentCorrelation.toFixed(2)}
        </Typography>
      </Box>

      <ChartContainer aspect={1.2} minHeight={300}>
        <ScatterChart margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" dataKey="x" name="X" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
          <YAxis type="number" dataKey="y" name="Y" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              formatVal(value, name === "X" ? activeFieldA : activeFieldB),
              name === "X" ? measurableFields.find(f => f.id === activeFieldA)?.name : measurableFields.find(f => f.id === activeFieldB)?.name
            ]}
          />
          <Scatter name="Logs" data={scatterData} fill={getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "0.8")} />
        </ScatterChart>
      </ChartContainer>
    </Box>
  </Fade>
);
