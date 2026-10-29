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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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

interface TrendNumericalChartProps {
  data: ChartDataPoint[];
  selectedField: string;
  setSelectedField: (id: string) => void;
  fields: CustomField[];
  ChartContainer: React.FC<ChartContainerProps & { fullHeight?: boolean }>;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentField = React.useMemo(() => fields.find(f => f.id === selectedField), [fields, selectedField]);
  const numberAndBoolFields = React.useMemo(() =>
    fields.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN),
    [fields]);

  const isHourly = React.useMemo(() =>
    currentField?.fieldType === FieldType.NUMBER && (currentField.optionsOrder || []).includes("isHourly"),
    [currentField]);

  const gradientId = `trendFill-${React.useId().replace(/:/g, "")}`;
  const values = data.map(d => d.value).filter((v): v is number => v !== null && v !== undefined);
  const sparse = values.length < 15;
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const isBoolean = currentField?.fieldType === FieldType.BOOLEAN;
  const formatValue = (val: number | string) => {
    if (isBoolean) return Number(val) === 1 ? "Oui" : "Non";
    if (isHourly) return formatHourlyValue(val.toString());
    return typeof val === "number" ? String(Math.round(val * 10) / 10).replace(".", ",") : val;
  };

  return (
    <ChartCard
      title="Tendances"
      subtitle={average !== null && !isBoolean ? `Moyenne sur la période : ${formatValue(average)}` : "Variations de vos indicateurs numériques ou oui/non."}
      help="La ligne pointillée indique la moyenne de la période sélectionnée."
      controls={
        <FormControl fullWidth size="small">
          <InputLabel>Champ numérique</InputLabel>
          <Select
            value={selectedField}
            label="Champ numérique"
            onChange={(e) => setSelectedField(e.target.value)}
            MenuProps={menuProps}
          >
            {numberAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      }
    >
      {values.length === 0 ? (
        <ChartEmpty>Aucune valeur sur cette période.</ChartEmpty>
      ) : (
        <ChartContainer aspect={2.6} minHeight={280} fullHeight>
          <AreaChart data={data} margin={isMobile ? { top: 12, right: 12, left: 0, bottom: 0 } : { top: 16, right: 24, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tick={axisTick}
              tickCount={4}
              tickFormatter={(val) => formatValue(val)}
              width={isMobile ? 40 : 50}
            />
            <Tooltip
              {...chartTooltipProps}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatValue(value ?? ""), currentField?.name || "Valeur"]}
            />
            {average !== null && !isBoolean && (
              <ReferenceLine y={average} stroke={chartColors.tick} strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Area
              type={sparse ? "linear" : "monotone"}
              dataKey="value"
              stroke={chartColors.primary}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={values.length <= 3 ? { r: 3, fill: chartColors.primary, stroke: chartColors.surface, strokeWidth: 1.5 } : false}
              name={currentField?.name || "Valeur"}
              activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface, fill: chartColors.primary }}
              connectNulls
            />
          </AreaChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
};
