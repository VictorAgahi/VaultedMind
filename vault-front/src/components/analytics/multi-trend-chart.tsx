/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Autocomplete,
  TextField,
  Chip,
  Tooltip as MuiTooltip
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
import { CustomField, FieldType, DailyLog } from "@/types";
import { formatHourlyValue } from "@/utils/time-converter";

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
}

interface MultiTrendChartProps {
  data: Record<string, string | number | boolean | null>[];
  fields: CustomField[];
  logs: DailyLog[];
  ChartContainer: React.FC<ChartContainerProps & { fullHeight?: boolean }>;
}

const LINE_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6"  // Blue
];

export const MultiTrendChart: React.FC<MultiTrendChartProps> = ({
  data,
  fields,
  logs,
  ChartContainer
}) => {
  // Filter numerical, boolean, and string fields
  const selectableFields = useMemo(() => 
    fields.filter(f => 
      f.fieldType === FieldType.NUMBER || 
      f.fieldType === FieldType.BOOLEAN || 
      f.fieldType === FieldType.STRING
    ),
    [fields]
  );

  // Default to selecting the first two fields if available
  const [selectedFields, setSelectedFields] = useState<CustomField[]>(() => 
    selectableFields.slice(0, 2)
  );

  // Helper maps for formatting qualitative fields
  const stringFieldMaps = useMemo(() => {
    const maps = new Map<string, { valueMap: Record<string, number>; reverseMap: Record<number, string> }>();
    fields.forEach(field => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder?.length) {
          field.optionsOrder.forEach((opt, i) => { valueMap[opt] = i; });
        } else {
          const uniqueVals = Array.from(new Set(logs.flatMap(l => {
            const v = l.fieldValues?.find(fv => fv.customFieldId === field.id)?.value;
            return v && v !== "-" ? [v] : [];
          }))) as string[];
          uniqueVals.sort().forEach((v, i) => { valueMap[v] = i; });
        }

        const reverseMap = Object.entries(valueMap).reduce(
          (acc, [k, v]) => ({ ...acc, [v]: k }),
          {} as Record<number, string>
        );

        maps.set(field.id, { valueMap, reverseMap });
      }
    });
    return maps;
  }, [fields, logs]);

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
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Comparatif Multicourbes</Typography>
              <MuiTooltip title="Sélectionnez plusieurs indicateurs pour comparer leurs tendances sur le même graphique.">
                <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
              </MuiTooltip>
            </Box>
            <Typography variant="body2" color="text.secondary">Superposez vos mesures pour identifier des corrélations visuelles.</Typography>
          </Box>
          
          <Box sx={{ width: { xs: "100%", md: 400 } }}>
            <Autocomplete<CustomField, true, false, false>
              multiple
              size="small"
              options={selectableFields}
              getOptionLabel={(option) => option.name}
              value={selectedFields}
              onChange={(_, newValue) => setSelectedFields(newValue as CustomField[])}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  variant="outlined" 
                  label="Indicateurs à comparer" 
                  placeholder="Ajouter..."
                />
              )}
              renderValue={(tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                  const { key: _key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={option.id}
                      label={option.name}
                      size="small"
                      sx={{ 
                        bgcolor: `${LINE_COLORS[index % LINE_COLORS.length]}20`,
                        color: LINE_COLORS[index % LINE_COLORS.length],
                        fontWeight: 700,
                        border: `1px solid ${LINE_COLORS[index % LINE_COLORS.length]}40`
                      }}
                      {...tagProps}
                    />
                  );
                })
              }
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, p: { xs: 1, md: 2 } }}>
        {selectedFields.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}>
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              Sélectionnez au moins un indicateur pour l&apos;afficher sur le graphique.
            </Typography>
          </Box>
        ) : (
          <ChartContainer aspect={1.6} mobileAspect={1.0} minHeight={350} fullHeight>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="dateDisplay" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#666", fontWeight: 600 }}
                minTickGap={20}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#666", fontWeight: 600 }}
                width={30}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                formatter={(val: any, name: any) => {
                  const field = selectedFields.find(f => f.name === name);
                  if (!field) return [val, name];
                  
                  if (field.fieldType === FieldType.BOOLEAN) {
                    return [val === 1 ? "Oui" : "Non", field.name];
                  }
                  if (field.fieldType === FieldType.NUMBER) {
                    const isHourly = (field.optionsOrder || []).includes("isHourly");
                    if (isHourly) {
                      return [formatHourlyValue(val.toString()), field.name];
                    }
                    return [val, field.name];
                  }
                  if (field.fieldType === FieldType.STRING) {
                    const mapInfo = stringFieldMaps.get(field.id);
                    if (mapInfo) {
                      const textVal = mapInfo.reverseMap[Number(val)];
                      return [textVal || val, field.name];
                    }
                  }
                  return [val, field.name];
                }}
              />
              <Legend />
              {selectedFields.map((field, index) => {
                const color = LINE_COLORS[index % LINE_COLORS.length];
                return (
                  <Line
                    key={field.id}
                    type="monotone"
                    dataKey={field.id}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 3, fill: color, strokeWidth: 1.5, stroke: "#fff" }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    name={field.name} // We use the friendly name for display in legend/tooltip
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ChartContainer>
        )}
      </Box>
    </Paper>
  );
};
