"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip as MuiTooltip,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery,
  MenuProps
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import dynamic from "next/dynamic";
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation, getCorrelationColor } from "@/utils/math";

const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const ScatterChart = dynamic(() => import("recharts").then(m => m.ScatterChart), { ssr: false });
const Scatter = dynamic(() => import("recharts").then(m => m.Scatter), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ children, aspect, mobileAspect, minHeight }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!ref.current) return;
    const observeTarget = ref.current;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  const finalAspect = isMobile && mobileAspect ? mobileAspect : aspect;

  return (
    <Box ref={ref} sx={{ width: "100%", minWidth: 0, minHeight }}>
      {width > 0 && (
        <ResponsiveContainer width={width} aspect={finalAspect} debounce={50}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </Box>
  );
};

interface CorrelationStudyProps {
  fields: CustomField[];
  logs: DailyLog[];
  menuProps?: Partial<MenuProps>;
}

interface ActiveCellInfo {
  x: string;
  y: string;
  value: number;
  color: string;
  xId: string;
  yId: string;
}

export const CorrelationStudy: React.FC<CorrelationStudyProps> = ({ fields, logs, menuProps }) => {

  const deferredLogs = React.useDeferredValue(logs);
  const deferredFields = React.useDeferredValue(fields);

  const [selectedFieldA, setSelectedFieldA] = useState<string>("");
  const [selectedFieldB, setSelectedFieldB] = useState<string>("");
  const [activeCell, setActiveCell] = useState<ActiveCellInfo | null>(null);

  const measurableFields = useMemo(() => {
    return deferredFields.filter(f =>
      f.isActive && (
        f.fieldType === FieldType.NUMBER ||
        f.fieldType === FieldType.BOOLEAN ||
        f.fieldType === FieldType.STRING
      )
    );
  }, [deferredFields]);

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
          deferredLogs.forEach(log => {
            const fv = log.fieldValues?.find(v => v.customFieldId === field.id);
            if (fv && fv.value) uniqueValues.add(fv.value);
          });
          Array.from(uniqueValues).sort().forEach((val, idx) => { valueMap[val] = idx; });
        }
        mappings[field.id] = valueMap;
      }
    });
    return mappings;
  }, [measurableFields, deferredLogs]);

  const getVal = useCallback((log: DailyLog, fieldId: string) => {
    const field = deferredFields.find(f => f.id === fieldId);
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!field || !fv || fv.value === undefined || fv.value === null) return null;

    if (field.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    if (field.fieldType === FieldType.STRING) {
      const mapping = fieldMappings[fieldId];
      return mapping?.[fv.value] ?? null;
    }
    return null;
  }, [deferredFields, fieldMappings]);

  const matrixData = useMemo(() => {
    const data: ActiveCellInfo[] = [];
    measurableFields.forEach((fa) => {
      measurableFields.forEach((fb) => {
        const pairs = deferredLogs.reduce<[number, number][]>((acc, log) => {
          const va = getVal(log, fa.id);
          const vb = getVal(log, fb.id);
          if (va !== null && vb !== null) acc.push([va, vb]);
          return acc;
        }, []);

        const correlation = calculatePearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1]));
        data.push({
          x: fa.name,
          y: fb.name,
          xId: fa.id,
          yId: fb.id,
          value: parseFloat(correlation.toFixed(2)),
          color: getCorrelationColor(correlation)
        });
      });
    });
    return data;
  }, [measurableFields, deferredLogs, getVal]);

  const getInterpretation = (val: number, nameA: string, nameB: string) => {
    if (nameA === nameB) return `C'est la corrélation d'une variable avec elle-même.`;
    if (Math.abs(val) < 0.2) return `Pratiquement aucune relation linéaire visible entre "${nameA}" et "${nameB}".`;
    if (val > 0.7) return `Forte relation positive : quand "${nameA}" augmente, "${nameB}" augmente aussi très souvent.`;
    if (val > 0.4) return `Relation positive modérée entre "${nameA}" et "${nameB}".`;
    if (val < -0.7) return `Forte relation négative : quand "${nameA}" augmente, "${nameB}" diminue fortement.`;
    if (val < -0.4) return `Relation négative modérée : quand "${nameA}" augmente, "${nameB}" a tendance à diminuer.`;
    return `Une relation légère détectée entre ces deux variables.`;
  };

  const scatterData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];
    return deferredLogs.reduce<{ x: number, y: number, date: string }[]>((acc, log) => {
      const va = getVal(log, activeFieldA);
      const vb = getVal(log, activeFieldB);
      if (va !== null && vb !== null) {
        acc.push({ x: va, y: vb, date: new Date(log.logDate).toLocaleDateString() });
      }
      return acc;
    }, []);
  }, [activeFieldA, activeFieldB, deferredLogs, getVal]);

  const temporalData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];
    return deferredLogs.map(log => ({
      date: new Date(log.logDate).toLocaleDateString(),
      [activeFieldA]: getVal(log, activeFieldA),
      [activeFieldB]: getVal(log, activeFieldB),
      rawDate: log._ts ?? new Date(log.logDate).getTime()
    })).sort((a, b) => a.rawDate - b.rawDate);
  }, [activeFieldA, activeFieldB, deferredLogs, getVal]);

  const currentCorrelation = useMemo(() => {
    if (scatterData.length === 0) return 0;
    return calculatePearsonCorrelation(scatterData.map(d => d.x), scatterData.map(d => d.y));
  }, [scatterData]);

  const refinedPaperStyle = {
    p: { xs: 2, md: 4 },
    borderRadius: 6,
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
    bgcolor: "background.paper"
  };

  return (
    <Box sx={{ mt: 4, position: "relative" }}>
      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* Correlation Matrix */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ ...refinedPaperStyle, position: "relative" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Matrice de Corrélation</Typography>
              <MuiTooltip title="Indique la force du lien entre deux mesures (-1 à 1). Cliquez sur une cellule pour zoomer.">
                <InfoIcon sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
              </MuiTooltip>
            </Box>

            <Box sx={{ overflowX: "auto", pb: 2, mb: 2 }}>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${measurableFields.length}, 1fr)`,
                gap: { xs: 0.5, md: 1 },
                minWidth: Math.max(0, measurableFields.length * 45),
              }}>
                {matrixData.map((cell) => (
                  <Box
                    key={`${cell.xId}-${cell.yId}`}
                    onClick={() => {
                      setSelectedFieldA(cell.xId);
                      setSelectedFieldB(cell.yId);
                      setActiveCell(cell);
                    }}
                    sx={{
                      aspectRatio: "1/1",
                      bgcolor: cell.color,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: (activeFieldA === cell.xId && activeFieldB === cell.yId) ? "3px solid #142949" : "1px solid rgba(0,0,0,0.03)",
                      "&:hover": { transform: "scale(1.05)", zIndex: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 900, color: Math.abs(cell.value) > 0.4 ? "white" : "text.primary", fontSize: "0.75rem" }}>
                      {cell.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Négative (-1)</Typography>
              <Box sx={{ flex: 1, mx: 2, height: 6, borderRadius: 3, background: "linear-gradient(to right, #ef4444, rgba(156, 163, 175, 0.2), #22c55e)" }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Positive (+1)</Typography>
            </Box>

            <Fade in={!!activeCell}>
              <Paper
                elevation={24}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: { xs: "90%", sm: "380px" },
                  p: 4,
                  borderRadius: 6,
                  zIndex: 100,
                  bgcolor: "white",
                  border: "1px solid rgba(0,0,0,0.1)",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>Détails</Typography>
                  <IconButton size="small" onClick={() => setActiveCell(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: activeCell?.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "1.2rem" }}>
                    {activeCell?.value}
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>{activeCell?.x}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>vs</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800 }}>{activeCell?.y}</Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: "text.secondary", bgcolor: "grey.50", p: 2.5, borderRadius: 4, border: "1px solid rgba(0,0,0,0.03)" }}>
                  {activeCell && getInterpretation(activeCell.value, activeCell.x, activeCell.y)}
                </Typography>
              </Paper>
            </Fade>
          </Paper>
        </Grid>

        {/* Details & Scatter Chart */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ ...refinedPaperStyle, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Analyse Détaillée</Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 4, flexDirection: "column" }}>
              <FormControl fullWidth size="small">
                <InputLabel>Variable X</InputLabel>
                <Select value={activeFieldA} label="Variable X" onChange={(e) => setSelectedFieldA(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={menuProps}>
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Variable Y</InputLabel>
                <Select value={activeFieldB} label="Variable Y" onChange={(e) => setSelectedFieldB(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={menuProps}>
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ textAlign: "center", mb: 4, p: 3, bgcolor: "rgba(99, 102, 241, 0.05)", borderRadius: 4, border: "1px solid rgba(99, 102, 241, 0.1)" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Coefficient r</Typography>
              <Typography variant="h2" sx={{ fontWeight: 900, color: getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "1)") }}>
                {currentCorrelation.toFixed(2)}
              </Typography>
            </Box>

            <ChartContainer aspect={1.2} minHeight={300}>
              <ScatterChart margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" dataKey="x" name="X" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis type="number" dataKey="y" name="Y" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Logs" data={scatterData} fill={getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "0.8")} />
              </ScatterChart>
            </ChartContainer>
          </Paper>
        </Grid>

        {/* Temporal Comparison Chart */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={refinedPaperStyle}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Comparaison Temporelle</Typography>
            <ChartContainer aspect={3} mobileAspect={1.5} minHeight={350}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} minTickGap={30} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} stroke="#6366f1" tick={{ fontSize: 10, fontWeight: 600 }} width={30} />
                <YAxis yAxisId="right" axisLine={false} tickLine={false} orientation="right" stroke="#ec4899" tick={{ fontSize: 10, fontWeight: 600 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                <Legend verticalAlign="top" height={40} />
                <Line yAxisId="left" type="monotone" dataKey={activeFieldA} name={measurableFields.find(f => f.id === activeFieldA)?.name} stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: "#6366f1" }} />
                <Line yAxisId="right" type="monotone" dataKey={activeFieldB} name={measurableFields.find(f => f.id === activeFieldB)?.name} stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: "#ec4899" }} />
              </LineChart>
            </ChartContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
