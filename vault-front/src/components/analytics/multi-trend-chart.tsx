/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  useMediaQuery,
  useTheme,
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
import { axisTick, chartColors, chartTooltipProps, MAX_SERIES_MOBILE, SERIES_COLORS, shortDateTick, percentTick } from "@/theme/chart-tokens";
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


export const MultiTrendChart: React.FC<MultiTrendChartProps> = ({
  data,
  fields,
  logs,
  ChartContainer
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const maxSeries = isMobile ? MAX_SERIES_MOBILE : SERIES_COLORS.length;

  // Filter numerical, boolean, and string fields
  const selectableFields = useMemo(() =>
    fields.filter(f =>
      f.fieldType === FieldType.NUMBER ||
      f.fieldType === FieldType.BOOLEAN ||
      f.fieldType === FieldType.STRING
    ),
    [fields]
  );

  // Chaque champ garde sa couleur tant qu'il reste sélectionné : retirer une courbe ne repeint pas les autres.
  const [selection, setSelection] = useState<{ field: CustomField; slot: number }[]>(() =>
    selectableFields.slice(0, 2).map((field, slot) => ({ field, slot }))
  );
  // La limite mobile s'applique à l'affichage : une sélection faite sur grand écran n'est pas perdue.
  const selectedFields = useMemo(
    () => selection.filter(s => s.slot < maxSeries).map(s => s.field),
    [selection, maxSeries]
  );
  const colorOf = (fieldId: string) => {
    const entry = selection.find(s => s.field.id === fieldId);
    return SERIES_COLORS[entry ? entry.slot : 0];
  };

  const handleSelectionChange = (next: CustomField[]) => {
    setSelection(prev => {
      const kept = prev.filter(p => next.some(n => n.id === p.field.id));
      const used = new Set(kept.map(k => k.slot));
      const added = next
        .filter(n => !kept.some(k => k.field.id === n.id))
        .map(field => {
          let slot = 0;
          while (used.has(slot)) slot++;
          used.add(slot);
          return { field, slot };
        });
      return [...kept, ...added].slice(0, maxSeries);
    });
  };

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

  // Une seule échelle : chaque série est ramenée à 0-100 % de sa propre plage, la valeur brute reste dans l'infobulle.
  const ranges = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>();
    selectedFields.forEach(field => {
      const values = data.map(d => d[field.id]).filter((v): v is number => typeof v === "number");
      if (values.length) map.set(field.id, { min: Math.min(...values), max: Math.max(...values) });
    });
    return map;
  }, [data, selectedFields]);

  const indexedData = useMemo(() => data.map(row => {
    const out: Record<string, string | number | boolean | null> = { ...row };
    selectedFields.forEach(field => {
      const v = row[field.id];
      const range = ranges.get(field.id);
      out[`${field.id}__idx`] = typeof v === "number" && range
        ? (range.max === range.min ? 50 : Math.round(((v - range.min) / (range.max - range.min)) * 100))
        : null;
    });
    return out;
  }), [data, selectedFields, ranges]);

  const formatRaw = (field: CustomField, val: unknown) => {
    if (val === null || val === undefined) return "-";
    if (field.fieldType === FieldType.BOOLEAN) return val === 1 ? "Oui" : "Non";
    if (field.fieldType === FieldType.NUMBER) {
      if ((field.optionsOrder || []).includes("isHourly")) return formatHourlyValue(String(val));
      return String(val).replace(".", ",");
    }
    if (field.fieldType === FieldType.STRING) {
      const mapInfo = stringFieldMaps.get(field.id);
      return mapInfo?.reverseMap[Number(val)] || String(val);
    }
    return String(val);
  };

  return (
    <ChartCard
      title="Comparatif"
      subtitle="Superposez vos mesures pour repérer des liens visuels."
      help="Chaque courbe est ramenée à sa propre plage (0 % = sa valeur la plus basse, 100 % = la plus haute), pour comparer des échelles différentes. L'infobulle affiche les vraies valeurs."
      controls={
        <Autocomplete<CustomField, true, false, false>
          multiple
          size="small"
          options={selectableFields}
          getOptionLabel={(option) => option.name}
          value={selectedFields}
          onChange={(_, newValue) => handleSelectionChange(newValue as CustomField[])}
          getOptionDisabled={(option) => selectedFields.length >= maxSeries && !selectedFields.some(f => f.id === option.id)}
          renderInput={(params) => (
            <TextField
              {...params}
              margin="none"
              variant="outlined"
              label={`Indicateurs à comparer (${maxSeries} max.)`}
              placeholder="Ajouter..."
            />
          )}
          renderValue={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { key: _key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={option.id}
                  label={option.name}
                  size="small"
                  icon={<Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: colorOf(option.id), ml: "8px !important" }} />}
                  sx={{ bgcolor: "background.paper", fontWeight: 700 }}
                  {...tagProps}
                />
              );
            })
          }
        />
      }
    >
      {selectedFields.length === 0 ? (
        <ChartEmpty>Sélectionnez au moins un indicateur pour l&apos;afficher.</ChartEmpty>
      ) : (
        <ChartContainer aspect={2.4} minHeight={300} fullHeight>
          <LineChart data={indexedData} margin={isMobile ? { top: 12, right: 12, left: 0, bottom: 0 } : { top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="dateDisplay"
            tickFormatter={(v) => shortDateTick(v, isMobile)}
              axisLine={{ stroke: chartColors.axis }}
              tickLine={false}
              tick={axisTick}
              minTickGap={isMobile ? 36 : 24}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={percentTick}
              width={isMobile ? 48 : 52}
            />
            <Tooltip
              {...chartTooltipProps}
              formatter={(_val: any, _name: any, item: any) => {
                const fieldId = String(item?.dataKey ?? "").replace(/__idx$/, "");
                const field = selectedFields.find(f => f.id === fieldId);
                if (!field) return [_val, _name];
                return [formatRaw(field, item?.payload?.[field.id]), field.name];
              }}
            />
            {selectedFields.map((field) => {
              const color = colorOf(field.id);
              const points = indexedData.filter(r => r[`${field.id}__idx`] !== null).length;
              return (
                <Line
                  key={field.id}
                  type={points < 15 ? "linear" : "monotone"}
                  dataKey={`${field.id}__idx`}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={points <= 3 ? { r: 3, fill: color, stroke: chartColors.surface, strokeWidth: 1.5 } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.surface, fill: color }}
                  name={field.name}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
};
