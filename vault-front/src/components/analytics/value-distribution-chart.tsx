"use client";

import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  MenuProps
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { CustomField } from "@/types";
import { ChartCard, ChartEmpty } from "./chart-card";
import { axisTick, chartColors, chartTooltipProps } from "@/theme/chart-tokens";

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
  ChartContainer: React.FC<ChartContainerProps & { fullHeight?: boolean }>;
  menuProps?: Partial<MenuProps>;
}

// Barres horizontales : les libellés restent lisibles sans rotation, même à 360px de large.
export const ValueDistributionChart: React.FC<ValueDistributionChartProps> = ({
  data,
  selectedField,
  setSelectedField,
  stringAndBoolFields,
  ChartContainer,
  menuProps
}) => {
  const sorted = React.useMemo(() => [...data].sort((a, b) => b.count - a.count).slice(0, 8), [data]);
  const labelWidth = Math.min(110, Math.max(56, ...sorted.map((d) => d.name.length * 7)));

  return (
    <ChartCard
      title="Répartition"
      subtitle="Les valeurs qui reviennent le plus souvent."
      help="Nombre de jours pour chaque valeur du champ choisi. Les 8 valeurs les plus fréquentes sont affichées."
      controls={
        <FormControl size="small" fullWidth>
          <InputLabel>Champ</InputLabel>
          <Select
            value={selectedField}
            label="Champ"
            onChange={(e) => setSelectedField(e.target.value)}
            MenuProps={menuProps}
          >
            {stringAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      }
    >
      {sorted.length === 0 ? (
        <ChartEmpty>Aucune valeur sur cette période.</ChartEmpty>
      ) : (
        <ChartContainer aspect={1.1} minHeight={Math.max(200, sorted.length * 36)} fullHeight>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={chartColors.grid} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ ...axisTick, fill: chartColors.ink }}
              width={labelWidth}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            />
            <Tooltip {...chartTooltipProps} cursor={{ fill: "var(--mui-palette-action-hover)" }} formatter={(value) => [`${value} jour${Number(value) > 1 ? "s" : ""}`, "Occurrences"]} />
            <Bar dataKey="count" name="Occurrences" fill={chartColors.primary} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList dataKey="count" position="right" style={{ fill: chartColors.ink, fontSize: 11, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
};
