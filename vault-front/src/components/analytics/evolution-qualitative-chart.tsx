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
  Tooltip as MuiTooltip,
  MenuProps
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
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
  menuProps?: Partial<MenuProps>;
}

export const EvolutionQualitativeChart: React.FC<EvolutionQualitativeChartProps> = ({
  data,
  valueMap,
  selectedField,
  setSelectedField,
  stringFields,
  ChartContainer,
  menuProps
}) => {
  const reverseMap = Object.entries(valueMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<number, string>);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
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
        <FormControl fullWidth size="small" sx={{ mb: 4 }}>
          <InputLabel>Champ qualitatif</InputLabel>
          <Select
            value={selectedField}
            label="Champ qualitatif"
            onChange={(e) => setSelectedField(e.target.value)}
            sx={{ borderRadius: 3 }}
            MenuProps={menuProps}
          >
            {stringFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <ChartContainer aspect={2.5} mobileAspect={1.1} minHeight={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} minTickGap={30} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#666" }}
            ticks={Object.values(valueMap)}
            tickFormatter={(val) => reverseMap[val] || val}
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

