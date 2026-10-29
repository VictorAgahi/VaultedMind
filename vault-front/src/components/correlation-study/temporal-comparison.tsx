"use client";

import React from "react";
import { Box, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import { SxProps, Theme } from "@mui/material";
import { CustomField } from "@/types";
import { axisTick, chartColors, chartTooltipProps, SERIES_COLORS, shortDateTick, percentTick } from "@/theme/chart-tokens";

interface TemporalComparisonProps {
  temporalData: Record<string, string | number | null>[];
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number, fullHeight?: boolean }>;
  activeFieldA: string;
  activeFieldB: string;
  measurableFields: CustomField[];
  formatVal: (val: number | string | null, id: string) => string | number;
  refinedPaperStyle: SxProps<Theme>;
}

// Une seule échelle : les deux variables sont ramenées à 0-100 % de leur plage, jamais deux axes Y.
export const TemporalComparison: React.FC<TemporalComparisonProps> = ({
  temporalData,
  ChartContainer,
  activeFieldA,
  activeFieldB,
  measurableFields,
  formatVal,
  refinedPaperStyle
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const series = [
    { id: activeFieldA, color: SERIES_COLORS[0], name: measurableFields.find(f => f.id === activeFieldA)?.name },
    { id: activeFieldB, color: SERIES_COLORS[1], name: measurableFields.find(f => f.id === activeFieldB)?.name },
  ];

  const indexed = React.useMemo(() => {
    const range = (id: string) => {
      const values = temporalData.map(d => d[id]).filter((v): v is number => typeof v === "number");
      return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
    };
    const ra = range(activeFieldA);
    const rb = range(activeFieldB);
    const norm = (v: unknown, r: { min: number; max: number } | null) =>
      typeof v === "number" && r ? (r.max === r.min ? 50 : Math.round(((v - r.min) / (r.max - r.min)) * 100)) : null;
    return temporalData.map(d => ({ ...d, __a: norm(d[activeFieldA], ra), __b: norm(d[activeFieldB], rb) }));
  }, [temporalData, activeFieldA, activeFieldB]);

  const pointsA = indexed.filter(d => d.__a !== null).length;
  const pointsB = indexed.filter(d => d.__b !== null).length;
  const curve = Math.max(pointsA, pointsB) < 15 ? "linear" : "monotone";
  const dotFor = (points: number, color: string) =>
    points <= 3 ? { r: 3, fill: color, stroke: chartColors.surface, strokeWidth: 1.5 } : false;

  return (
    <Paper sx={{ ...refinedPaperStyle }}>
      <Box sx={{ display: "grid", gap: 1, mb: 1 }}>
        <Typography variant="h5" component="h2">Dans le temps</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {series.map((s) => (
            <Box key={s.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: s.color }} />
              <Typography variant="caption" color="text.secondary">{s.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <ChartContainer aspect={2.6} minHeight={300}>
        <LineChart data={indexed} margin={isMobile ? { top: 12, right: 12, left: 0, bottom: 0 } : { top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis dataKey="date" tickFormatter={(v) => shortDateTick(v, isMobile)} axisLine={{ stroke: chartColors.axis }} tickLine={false} tick={axisTick} minTickGap={isMobile ? 36 : 30} padding={{ left: 8, right: 8 }} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={percentTick} width={isMobile ? 48 : 52} />
          <Tooltip
            {...chartTooltipProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(_value: any, _name: any, props: any) => {
              const id = props.dataKey === "__a" ? activeFieldA : activeFieldB;
              return [formatVal(props.payload?.[id] ?? null, id), measurableFields.find(f => f.id === id)?.name];
            }}
          />
          <Line type={curve} dataKey="__a" name={series[0].name} stroke={series[0].color} strokeWidth={2} dot={dotFor(pointsA, series[0].color)} activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface, fill: series[0].color }} connectNulls />
          <Line type={curve} dataKey="__b" name={series[1].name} stroke={series[1].color} strokeWidth={2} dot={dotFor(pointsB, series[1].color)} activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface, fill: series[1].color }} connectNulls />
        </LineChart>
      </ChartContainer>
    </Paper>
  );
};
