"use client";

import React from "react";
import { Box, Typography, Paper, useTheme } from "@mui/material";
import dynamic from "next/dynamic";
import { CustomField } from "@/types";

const ScatterChart = dynamic(() => import("recharts").then(m => m.ScatterChart), { ssr: false });
const Scatter = dynamic(() => import("recharts").then(m => m.Scatter), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const ZAxis = dynamic(() => import("recharts").then(m => m.ZAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

interface CorrelationDataPoint {
  x: number;
  y: number;
  z: number;
}

interface CorrelationScatterChartProps {
  data: CorrelationDataPoint[];
  fieldA: CustomField | null;
  fieldB: CustomField | null;
}

export const CorrelationScatterChart: React.FC<CorrelationScatterChartProps> = ({ data, fieldA, fieldB }) => {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 4, borderRadius: 6, height: "100%" }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Détail de Corrélation</Typography>
      <Box sx={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis type="number" dataKey="x" name={fieldA?.name} unit="" label={{ value: fieldA?.name, position: 'bottom', offset: 0 }} />
            <YAxis type="number" dataKey="y" name={fieldB?.name} unit="" label={{ value: fieldB?.name, angle: -90, position: 'insideLeft' }} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} name="Occurrences" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Logs" data={data} fill={theme.palette.primary.main} />
          </ScatterChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
        Ce graphique montre comment {fieldB?.name} évolue par rapport à {fieldA?.name}.
      </Typography>
    </Paper>
  );
};
