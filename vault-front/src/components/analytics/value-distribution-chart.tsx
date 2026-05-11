"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip as MuiTooltip
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
import { CustomField } from "@/types";

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
}

interface ValueDistributionChartProps {
  data: { name: string; count: number }[];
  selectedField: string;
  setSelectedField: (id: string) => void;
  stringAndBoolFields: CustomField[];
  ChartContainer: React.FC<ChartContainerProps>;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const ValueDistributionChart: React.FC<ValueDistributionChartProps> = ({
  data,
  selectedField,
  setSelectedField,
  stringAndBoolFields,
  ChartContainer
}) => {
  return (
    <Paper sx={{ p: 4, borderRadius: 6, height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Répartition</Typography>
            <MuiTooltip title="Découvrez quelles valeurs reviennent le plus souvent.">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">Fréquence d&apos;apparition des valeurs.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Champ</InputLabel>
          <Select
            value={selectedField}
            label="Champ"
            onChange={(e) => setSelectedField(e.target.value)}
          >
            {stringAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <ChartContainer aspect={2} minHeight={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Occurrences">
            {data.map((item) => (
              <Cell key={`cell-${item.name}`} fill={COLORS[data.indexOf(item) % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </Paper>
  );
};
