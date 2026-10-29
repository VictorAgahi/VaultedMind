"use client";

import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  MenuProps,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard, ChartEmpty } from "./chart-card";
import { axisTick, chartColors, chartTooltipProps, shortDateTick } from "@/theme/chart-tokens";
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
    <ChartCard
      title={field?.name || "Évolution"}
      subtitle="Évolution de vos ressentis et de vos mesures dans le temps."
      help="Pour un champ texte, chaque valeur est placée sur une échelle selon l'ordre défini dans vos champs."
      controls={
        <FormControl fullWidth size="small">
          <InputLabel>Champ à analyser</InputLabel>
          <Select
            value={selectedField}
            label="Champ à analyser"
            onChange={(e) => setSelectedField(e.target.value)}
            MenuProps={menuProps}
          >
            {stringFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      }
    >
      {!data.some(d => d.value !== null && d.value !== undefined) ? (
        <ChartEmpty>Aucune valeur sur cette période.</ChartEmpty>
      ) : (
      <ChartContainer aspect={2} minHeight={300} fullHeight>
        <LineChart data={data} margin={isMobile ? { top: 12, right: 12, left: 0, bottom: 0 } : { top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis
            dataKey="dateDisplay"
            tickFormatter={(v) => shortDateTick(v, isMobile)}
            axisLine={{ stroke: chartColors.axis }}
            tickLine={false}
            tick={axisTick}
            minTickGap={isMobile ? 36 : 24}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={!isHourly}
            tick={axisTick}
            domain={isNumeric ? ["dataMin", "dataMax"] : [0, Math.max(...Object.values(valueMap), 1)]}
            ticks={!isNumeric && Object.keys(valueMap).length > 0 ? Object.values(valueMap) : undefined}
            tickCount={isNumeric ? 4 : undefined}
            tickFormatter={(val) => {
              if (isHourly) {
                return formatHourlyValue(val.toString());
              }
              const text = reverseMap[val] || val.toString();
              const max = isMobile ? 8 : 12;
              return text.length > max ? text.substring(0, max - 1) + "…" : text;
            }}
            width={isMobile ? 56 : 76}
          />
          <Tooltip
            {...chartTooltipProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(val: any) => {
              if (isHourly) {
                return [formatHourlyValue((val ?? "").toString()), "Valeur"];
              }
              return [reverseMap[Number(val)] || (val ?? "").toString(), isNumeric ? "Valeur" : "État"];
            }}
          />
          <Line
            type={data.filter(d => d.value !== null).length < 15 ? "linear" : "monotone"}
            dataKey="value"
            stroke={chartColors.primary}
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 3, fill: chartColors.primary, strokeWidth: 2, stroke: chartColors.surface } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface }}
            name={field?.name || "Valeur"}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
      )}
    </ChartCard>
  );
};
