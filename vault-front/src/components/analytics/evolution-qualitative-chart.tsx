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

const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
import { CustomField } from "@/types";

interface ChartDataPoint {
  key: string;
  dateDisplay: string;
  value: number | null;
  label: string;
}

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
}

interface EvolutionQualitativeChartProps {
  data: ChartDataPoint[];
  valueMap: Record<string, number>;
  selectedField: string;
  setSelectedField: (id: string) => void;
  stringFields: CustomField[];
  ChartContainer: React.FC<ChartContainerProps>;
}

export const EvolutionQualitativeChart: React.FC<EvolutionQualitativeChartProps> = ({
  data,
  valueMap,
  selectedField,
  setSelectedField,
  stringFields,
  ChartContainer
}) => {
  const reverseMap = Object.entries(valueMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<number, string>);

  return (
    <Paper sx={{ p: 4, borderRadius: 6 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Évolution Qualitative</Typography>
            <MuiTooltip title="Visualisez l'évolution de vos ressentis textuels dans le temps.">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">Suivi des tendances pour vos mesures textuelles.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Champ à analyser</InputLabel>
          <Select
            value={selectedField}
            label="Champ à analyser"
            onChange={(e) => setSelectedField(e.target.value)}
          >
            {stringFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <ChartContainer aspect={3} mobileAspect={1.5} minHeight={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} minTickGap={30} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#666" }}
            domain={[0, Math.max(0, ...Object.values(valueMap))]}
            tickFormatter={(val) => reverseMap[val] || ""}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            formatter={(value: string | number | readonly (string | number)[] | undefined) => [reverseMap[Number(value)] || value, "Valeur"]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={4}
            dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="Ressenti"
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </Paper>
  );
};

