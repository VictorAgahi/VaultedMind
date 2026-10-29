"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  MenuProps,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { ChartContainer } from "@/components/analytics/chart-container";
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation, getCorrelationColor } from "@/utils/math";
import { formatHourlyValue } from "@/utils/time-converter";

import { CorrelationRanking, CorrelationLegend } from "./correlation-ranking";
import { CorrelationMatrix } from "./correlation-matrix";
import { CorrelationDetail } from "./correlation-detail";
import { TemporalComparison } from "./temporal-comparison";

// --- Types & Helper Functions ---

interface ActiveCellInfo {
  x: string;
  y: string;
  value: number;
  color: string;
  xId: string;
  yId: string;
  n: number;
}

const getVal = (log: DailyLog, fieldId: string, fields: CustomField[], mappings: Record<string, Record<string, number>>) => {
  const field = fields.find(f => f.id === fieldId);
  const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
  if (!field || !fv || fv.value === undefined || fv.value === null) return null;

  if (field.fieldType === FieldType.NUMBER) {
    const parsed = parseFloat(fv.value);
    return isNaN(parsed) ? null : parsed;
  }
  if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
  if (field.fieldType === FieldType.STRING) {
    return mappings[fieldId]?.[fv.value] ?? null;
  }
  return null;
};

const getInterpretation = (val: number, nameA: string, nameB: string) => {
  if (nameA === nameB) return `C'est la corrélation d'une variable avec elle-même.`;
  if (Math.abs(val) < 0.2) return `Pratiquement aucune relation linéaire visible entre "${nameA}" et "${nameB}".`;
  if (val > 0.7) return `Forte relation positive : quand "${nameA}" augmente, "${nameB}" augmente aussi très souvent.`;
  if (val > 0.4) return `Relation positive modérée entre "${nameA}" et "${nameB}".`;
  if (val < -0.7) return `Forte relation négative : quand "${nameA}" augmente, "${nameB}" diminue fortement.`;
  if (val < -0.4) return `Relation négative modérée : quand "${nameA}" augmente, "${nameB}" a tendance à diminuer.`;
  return `Une relation légère détectée entre ces deux variables.`;
};

// --- Main Component ---

interface CorrelationStudyProps {
  fields: CustomField[];
  logs: DailyLog[];
  menuProps?: Partial<MenuProps>;
}

export const CorrelationStudy: React.FC<CorrelationStudyProps> = ({ fields, logs }) => {
  const [selectedFieldA, setSelectedFieldA] = useState<string>("");
  const [selectedFieldB, setSelectedFieldB] = useState<string>("");

  const measurableFields = useMemo(() => {
    return fields.filter(f =>
      f.isActive && (
        f.fieldType === FieldType.NUMBER ||
        f.fieldType === FieldType.BOOLEAN ||
        f.fieldType === FieldType.STRING
      )
    );
  }, [fields]);

  const activeFieldA = selectedFieldA || (measurableFields[0]?.id ?? "");
  const activeFieldB = selectedFieldB || (measurableFields[1]?.id ?? "");


  const fieldMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};
    measurableFields.forEach(field => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder && field.optionsOrder.length > 0) {
          field.optionsOrder.forEach((val, idx) => { valueMap[val] = idx; });
        } else {
          const uniqueValues = new Set<string>();
          logs.forEach(log => {
            const fv = log.fieldValues?.find(v => v.customFieldId === field.id);
            if (fv && fv.value) uniqueValues.add(fv.value);
          });
          Array.from(uniqueValues).sort().forEach((val, idx) => { valueMap[val] = idx; });
        }
        mappings[field.id] = valueMap;
      }
    });
    return mappings;
  }, [measurableFields, logs]);

  const matrixData = useMemo(() => {
    const data: ActiveCellInfo[] = [];
    measurableFields.forEach((fa) => {
      measurableFields.forEach((fb) => {
        const pairs = logs.reduce<[number, number][]>((acc, log) => {
          const va = getVal(log, fa.id, fields, fieldMappings);
          const vb = getVal(log, fb.id, fields, fieldMappings);
          if (va !== null && vb !== null) acc.push([va, vb]);
          return acc;
        }, []);

        const correlation = calculatePearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
        data.push({
          x: fa.name,
          y: fb.name,
          xId: fa.id,
          yId: fb.id,
          value: correlation,
          color: getCorrelationColor(correlation),
          n: pairs.length
        });
      });
    });
    return data;
  }, [measurableFields, logs, fields, fieldMappings]);

  const scatterData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];
    return logs.reduce<{ x: number, y: number, date: string }[]>((acc, log) => {
      const va = getVal(log, activeFieldA, fields, fieldMappings);
      const vb = getVal(log, activeFieldB, fields, fieldMappings);
      if (va !== null && vb !== null) {
        acc.push({ x: va, y: vb, date: new Date(log.logDate).toLocaleDateString() });
      }
      return acc;
    }, []);
  }, [activeFieldA, activeFieldB, logs, fields, fieldMappings]);

  const temporalData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];
    return logs.map(log => {
      const floatA = getVal(log, activeFieldA, fields, fieldMappings);
      const floatB = getVal(log, activeFieldB, fields, fieldMappings);
      return {
        date: new Date(log.logDate).toLocaleDateString(),
        [activeFieldA]: floatA,
        [activeFieldB]: floatB,
        rawDate: log._ts ?? new Date(log.logDate).getTime()
      };
    }).sort((a, b) => a.rawDate - b.rawDate);
  }, [activeFieldA, activeFieldB, logs, fields, fieldMappings]);

  const formatVal = useCallback((val: number | string | null, fieldId: string) => {
    if (val === null) return "-";
    const field = fields.find(f => f.id === fieldId);
    if (!field) return val;
    if (field.fieldType === FieldType.BOOLEAN) return Number(val) === 1 ? "Oui" : "Non";
    if (field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
      return formatHourlyValue(val);
    }
    if (field.fieldType === FieldType.STRING) {
      const mapping = fieldMappings[fieldId];
      if (mapping) {
        return Object.keys(mapping).find(key => mapping[key] === Number(val)) || val;
      }
    }
    return val;
  }, [fields, fieldMappings]);

  const currentCorrelation = useMemo(() => {
    if (scatterData.length === 0) return 0;
    return calculatePearsonCorrelation(scatterData.map(d => d.x), scatterData.map(d => d.y));
  }, [scatterData]);

  const refinedPaperStyle = {
    p: { xs: 2, md: 3 },
    borderRadius: 4,
    display: "flex",
    flexDirection: "column"
  } as const;

  const detailRef = React.useRef<HTMLDivElement>(null);
  const selectPair = (xId: string, yId: string, scroll: boolean) => {
    setSelectedFieldA(xId);
    setSelectedFieldB(yId);
    if (scroll) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (measurableFields.length < 2) {
    return (
      <Box>
        <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            Pas assez de données pour l&apos;étude de corrélation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Il vous faut au moins 2 champs (Numérique, Booléen ou Texte) pour comparer les variables.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ ...refinedPaperStyle, gap: 2 }}>
            <Box>
              <Typography variant="h5" component="h2">Liens entre vos indicateurs</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Touchez une paire pour voir le détail.
              </Typography>
            </Box>
            <CorrelationLegend />
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <CorrelationRanking
                matrixData={matrixData}
                fieldOrder={measurableFields.map(f => f.id)}
                activeFieldA={activeFieldA}
                activeFieldB={activeFieldB}
                onSelect={(cell) => selectPair(cell.xId, cell.yId, true)}
              />
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <CorrelationMatrix
                measurableFields={measurableFields}
                matrixData={matrixData}
                activeFieldA={activeFieldA}
                activeFieldB={activeFieldB}
                onCellClick={(cell) => selectPair(cell.xId, cell.yId, false)}
              />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <FormControl size="small">
                <InputLabel>Variable X</InputLabel>
                <Select
                  value={activeFieldA}
                  label="Variable X"
                  onChange={(e) => setSelectedFieldA(e.target.value)}
                >
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Variable Y</InputLabel>
                <Select
                  value={activeFieldB}
                  label="Variable Y"
                  onChange={(e) => setSelectedFieldB(e.target.value)}
                >
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }} ref={detailRef} sx={{ scrollMarginTop: 16 }}>
          <Paper sx={{ ...refinedPaperStyle, height: "100%", position: "relative", overflow: "hidden" }}>
            <CorrelationDetail
              activeCell={matrixData.find(c => c.xId === activeFieldA && c.yId === activeFieldB) || null}
              onClose={() => { }} // Disabled close since we always show a cell
              getInterpretation={getInterpretation}
              currentCorrelation={currentCorrelation}
              ChartContainer={ChartContainer}
              scatterData={scatterData}
              activeFieldA={activeFieldA}
              activeFieldB={activeFieldB}
              measurableFields={measurableFields}
              formatVal={formatVal}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TemporalComparison
            temporalData={temporalData}
            ChartContainer={ChartContainer}
            activeFieldA={activeFieldA}
            activeFieldB={activeFieldB}
            measurableFields={measurableFields}
            formatVal={formatVal}
            refinedPaperStyle={refinedPaperStyle}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
