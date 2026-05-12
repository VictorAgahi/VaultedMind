"use client";

import React from "react";
import { Typography, Paper } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

import { SxProps, Theme } from "@mui/material";
import { CustomField } from "@/types";

interface TemporalComparisonProps {
  temporalData: Record<string, string | number | null>[];
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number, fullHeight?: boolean }>;
  activeFieldA: string;
  activeFieldB: string;
  measurableFields: CustomField[];
  formatVal: (val: number | string | null, id: string) => string | number;
  refinedPaperStyle: SxProps<Theme>;
}

export const TemporalComparison: React.FC<TemporalComparisonProps> = ({
  temporalData,
  ChartContainer,
  activeFieldA,
  activeFieldB,
  measurableFields,
  formatVal,
  refinedPaperStyle
}) => (
  <Paper elevation={0} sx={{ ...refinedPaperStyle, height: { xs: 500, md: 600 } }}>
    <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Comparaison Temporelle</Typography>
    <ChartContainer aspect={1.8} mobileAspect={0.8} minHeight={400} fullHeight>
      <LineChart data={temporalData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 600 }}
          minTickGap={30}
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          stroke="#6366f1"
          tick={{ fontSize: 10, fontWeight: 700 }}
          width={40}
        />
        <YAxis
          yAxisId="right"
          axisLine={false}
          tickLine={false}
          orientation="right"
          stroke="#ec4899"
          tick={{ fontSize: 10, fontWeight: 700 }}
          width={40}
        />
        <Tooltip
          contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, _name: any, props: any) => [
            formatVal(value, props.dataKey as string),
            measurableFields.find(f => f.id === props.dataKey)?.name
          ]}
        />
        <Legend verticalAlign="top" height={60} wrapperStyle={{ paddingBottom: '20px' }} />
        <Line yAxisId="left" type="monotone" dataKey={activeFieldA} name={measurableFields.find(f => f.id === activeFieldA)?.name} stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: "#6366f1" }} />
        <Line yAxisId="right" type="monotone" dataKey={activeFieldB} name={measurableFields.find(f => f.id === activeFieldB)?.name} stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: "#ec4899" }} />
      </LineChart>
    </ChartContainer>
  </Paper>
);
