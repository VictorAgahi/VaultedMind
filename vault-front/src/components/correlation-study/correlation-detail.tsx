"use client";

import React from "react";
import { Box, Typography, Fade } from "@mui/material";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getCorrelationAccent } from "@/utils/math";
import { axisTick, chartColors, chartTooltipProps } from "@/theme/chart-tokens";

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
  getInterpretation,
  currentCorrelation,
  ChartContainer,
  scatterData,
  activeFieldA,
  activeFieldB,
  measurableFields,
  formatVal
}) => {
  const nameA = measurableFields.find(f => f.id === activeFieldA)?.name;
  const nameB = measurableFields.find(f => f.id === activeFieldB)?.name;
  const accent = getCorrelationAccent(currentCorrelation);

  return (
    <Fade in={!!activeCell} timeout={280}>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">Détail du lien</Typography>
            <Typography variant="h5" component="h2" sx={{ overflowWrap: "anywhere" }}>
              {nameA} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>et</Box> {nameB}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flex: "none" }}>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.25rem", lineHeight: 1, color: accent, fontVariantNumeric: "tabular-nums" }}>
              {currentCorrelation > 0 ? "+" : ""}{currentCorrelation.toFixed(2).replace(".", ",")}
            </Typography>
            <Typography variant="caption" color="text.secondary">coefficient r sur {scatterData.length} jours</Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: "text.secondary", bgcolor: "action.hover", p: 2, borderRadius: 3 }}>
          {activeCell && getInterpretation(activeCell.value, activeCell.x, activeCell.y)}
          {scatterData.length < 14 && ` Seulement ${scatterData.length} jours en commun : ce lien est à confirmer avec plus de données.`}
          {" "}Un lien statistique ne dit pas lequel influence l&apos;autre.
        </Typography>

        <ChartContainer aspect={1.3} minHeight={280}>
          <ScatterChart margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} />
            <XAxis type="number" dataKey="x" name="X" domain={["dataMin - 1", "dataMax + 1"]} allowDecimals={false} axisLine={{ stroke: chartColors.axis }} tickLine={false} tick={axisTick} tickFormatter={(v) => String(formatVal(v, activeFieldA))}
              label={{ value: nameA, position: "insideBottomRight", offset: -2, fill: chartColors.tick, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Y" domain={["dataMin - 1", "dataMax + 1"]} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} width={40} tickFormatter={(v) => String(formatVal(v, activeFieldB))}
              label={{ value: nameB, angle: -90, position: "insideTopLeft", offset: 12, fill: chartColors.tick, fontSize: 11 }} />
            <Tooltip
              {...chartTooltipProps}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatVal(value, name === "X" ? activeFieldA : activeFieldB),
                name === "X" ? nameA : nameB
              ]}
            />
            <Scatter name="Jours" data={scatterData} fill={chartColors.primary} fillOpacity={0.75} stroke={chartColors.surface} strokeWidth={1.5} />
          </ScatterChart>
        </ChartContainer>
      </Box>
    </Fade>
  );
};
