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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { CustomField, FieldType } from "@/types";

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

interface TrendNumericalChartProps {
  data: ChartDataPoint[];
  selectedField: string;
  setSelectedField: (id: string) => void;
  fields: CustomField[];
  ChartContainer: React.FC<ChartContainerProps>;
  menuProps?: Partial<MenuProps>;
}

export const TrendNumericalChart: React.FC<TrendNumericalChartProps> = ({
  data,
  selectedField,
  setSelectedField,
  fields,
  ChartContainer,
  menuProps
}) => {
  const currentField = React.useMemo(() => fields.find(f => f.id === selectedField), [fields, selectedField]);
  const numberAndBoolFields = React.useMemo(() =>
    fields.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN),
    [fields]);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Tendances</Typography>
            <MuiTooltip title="Observez les variations de vos indicateurs numériques ou binaires.">
              <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </MuiTooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">Analyse temporelle des valeurs.</Typography>
        </Box>
        <FormControl fullWidth size="small" sx={{ mb: 4 }}>
          <InputLabel>Champ numérique</InputLabel>
          <Select
            value={selectedField}
            label="Champ numérique"
            onChange={(e) => setSelectedField(e.target.value)}
            sx={{ borderRadius: 3 }}
            MenuProps={menuProps}
          >
            {numberAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <ChartContainer aspect={2} minHeight={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="dateDisplay" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#666" }} minTickGap={30} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#666" }}
            tickFormatter={(val) => currentField?.fieldType === FieldType.BOOLEAN ? (val === 1 ? "Oui" : "Non") : val}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            formatter={(value: string | number | readonly (string | number)[] | undefined) => [
              currentField?.fieldType === FieldType.BOOLEAN
                ? (Number(value) === 1 ? "Oui" : "Non")
                : value,
              "Valeur"
            ]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            name="Niveau"
            connectNulls
          />
        </AreaChart>
      </ChartContainer>
    </Paper>
  );
};
