"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert
} from "@mui/material";
import dynamic from "next/dynamic";
import { CustomField, DailyLog, FieldType } from "@/types";

const CorrelationMatrix = dynamic(() => import("./correlation-matrix").then(m => m.CorrelationMatrix), { ssr: false });
const CorrelationScatterChart = dynamic(() => import("./correlation-scatter-chart").then(m => m.CorrelationScatterChart), { ssr: false });

interface CorrelationStudyProps {
  fields: CustomField[];
  logs: DailyLog[];
}


export const CorrelationStudy: React.FC<CorrelationStudyProps> = ({ fields, logs }) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(["", ""]);

  const activeFields = useMemo(() =>
    fields.filter(f => f.isActive && f.fieldType !== FieldType.DATE),
    [fields]);

  const fieldsMap = useMemo(() => new Map(activeFields.map(f => [f.id, f])), [activeFields]);

  const numericMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};
    activeFields.forEach(f => {
      if (f.fieldType === FieldType.STRING) {
        const vm: Record<string, number> = {};
        if (f.optionsOrder?.length) f.optionsOrder.forEach((v, i) => { vm[v] = i; });
        else {
          const u = new Set<string>();
          logs.forEach(l => {
            const fv = l.fieldValues?.find(v => v.customFieldId === f.id);
            if (fv?.value) u.add(fv.value);
          });
          Array.from(u).sort().forEach((v, i) => { vm[v] = i; });
        }
        mappings[f.id] = vm;
      }
    });
    return mappings;
  }, [activeFields, logs]);

  const getNumVal = React.useCallback((log: DailyLog, fid: string) => {
    const f = fieldsMap.get(fid);
    const fv = log.fieldValues?.find(v => v.customFieldId === fid);
    if (!f || !fv?.value) return null;
    if (f.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (f.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    return numericMappings[fid]?.[fv.value] ?? null;
  }, [fieldsMap, numericMappings]);

  const correlationMatrix = useMemo(() => {
    const matrix: number[][] = [];
    activeFields.forEach((fA, i) => {
      matrix[i] = [];
      activeFields.forEach((fB, j) => {
        if (i === j) { matrix[i][j] = 1; return; }
        const pairs: [number, number][] = [];
        logs.forEach(l => {
          const vA = getNumVal(l, fA.id);
          const vB = getNumVal(l, fB.id);
          if (vA !== null && vB !== null) pairs.push([vA, vB]);
        });
        if (pairs.length < 5) { matrix[i][j] = 0; return; }
        const n = pairs.length;
        const sumA = pairs.reduce((s, p) => s + p[0], 0);
        const sumB = pairs.reduce((s, p) => s + p[1], 0);
        const sumAB = pairs.reduce((s, p) => s + p[0] * p[1], 0);
        const sumA2 = pairs.reduce((s, p) => s + p[0] * p[0], 0);
        const sumB2 = pairs.reduce((s, p) => s + p[1] * p[1], 0);
        const num = n * sumAB - sumA * sumB;
        const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
        matrix[i][j] = den === 0 ? 0 : num / den;
      });
    });
    return matrix;
  }, [activeFields, logs, getNumVal]);

  const scatterData = useMemo(() => {
    const [idA, idB] = selectedFields;
    if (!idA || !idB) return [];
    const counts = new Map<string, number>();
    logs.forEach(l => {
      const vA = getNumVal(l, idA), vB = getNumVal(l, idB);
      if (vA !== null && vB !== null) {
        const k = `${vA},${vB}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([k, z]) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y, z };
    });
  }, [selectedFields, logs, getNumVal]);

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <CorrelationMatrix matrix={correlationMatrix} activeFields={activeFields} />
      </Grid>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 4, borderRadius: 6, mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Analyse croisée</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Variable X</InputLabel>
              <Select value={selectedFields[0]} label="Variable X" onChange={e => setSelectedFields([e.target.value, selectedFields[1]])}>
                {activeFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Variable Y</InputLabel>
              <Select value={selectedFields[1]} label="Variable Y" onChange={e => setSelectedFields([selectedFields[0], e.target.value])}>
                {activeFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Paper>
        {selectedFields[0] && selectedFields[1] ? (
          <CorrelationScatterChart data={scatterData} fieldA={fieldsMap.get(selectedFields[0]) as CustomField} fieldB={fieldsMap.get(selectedFields[1]) as CustomField} />
        ) : (
          <Alert severity="info" sx={{ borderRadius: 4 }}>Sélectionnez deux variables pour voir le détail.</Alert>
        )}
      </Grid>
    </Grid>
  );
};
