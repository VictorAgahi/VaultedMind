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
  MenuProps,
  useTheme,
  useMediaQuery,
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
import { CustomField, FieldType } from "@/types";
import { formatHourlyValue } from "@/utils/time-converter";

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
  ChartContainer: React.FC<ChartContainerProps & { fullHeight?: boolean }>;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const reverseMap = Object.entries(valueMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<number, string>);
  
  const field = stringFields.find(f => f.id === selectedField);
  const isHourly = field?.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly");
  const isNumeric = field?.fieldType === FieldType.NUMBER;

  return (
    <Paper elevation={0} sx={{ 
      borderRadius: 6, 
      border: "1px solid rgba(0,0,0,0.05)", 
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <Box sx={{ p: { xs: 2, md: 4 }, pb: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Évolution Temporelle & Qualitative</Typography>
              <MuiTooltip title="Visualisez l'évolution de vos ressentis et de vos mesures physiques dans le temps.">
                <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
              </MuiTooltip>
            </Box>
            <Typography variant="body2" color="text.secondary">Suivi des tendances pour vos mesures qualitatives et numériques.</Typography>
          </Box>
          <FormControl fullWidth size="small" sx={{ mb: 4 }}>
            <InputLabel>Champ à analyser</InputLabel>
            <Select
              value={selectedField}
              label="Champ à analyser"
              onChange={(e) => setSelectedField(e.target.value)}
              sx={{ borderRadius: 3 }}
              MenuProps={menuProps}
            >
              {stringFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>
 
      <Box sx={{ flexGrow: 1 }}>
        <ChartContainer aspect={1.5} mobileAspect={1.0} minHeight={350} fullHeight>
          <LineChart data={data} margin={isMobile ? { top: 15, right: 8, left: 0, bottom: 10 } : { top: 35, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis 
              dataKey="dateDisplay" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#666", fontWeight: 600 }} 
              minTickGap={20}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={!isHourly}
              tick={{ fontSize: 10, fill: "#666", fontWeight: 600 }}
              domain={isNumeric ? ['auto', 'auto'] : [0, Math.max(...Object.values(valueMap), 1)]}
              ticks={(!isNumeric || Object.keys(valueMap).length <= 8) ? Object.values(valueMap) : undefined}
              tickFormatter={(val) => {
                if (isHourly) {
                  return formatHourlyValue(val.toString());
                }
                const text = reverseMap[val] || val.toString();
                return text.length > 12 ? text.substring(0, 10) + '...' : text;
              }}
              width={isMobile ? 50 : 70}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(val: any) => {
                if (isHourly) {
                  return [formatHourlyValue((val ?? "").toString()), "Valeur"];
                }
                return [reverseMap[Number(val)] || (val ?? "").toString(), isNumeric ? "Valeur" : "État"];
              }}
            />
            <Legend verticalAlign="top" height={50} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={4}
              dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name={field?.name || "Valeur"}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      </Box>
    </Paper>
  );
};
