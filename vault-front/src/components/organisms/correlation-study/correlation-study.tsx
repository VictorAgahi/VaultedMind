"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip as MuiTooltip,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

function ChartContainer({ children, aspect, mobileAspect, minHeight }: { children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number }) {
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
}
import { CustomField, DailyLog, FieldType } from "@/types";
import { calculatePearsonCorrelation, getCorrelationColor } from "@/utils/math";

interface CorrelationStudyProps {
  fields: CustomField[];
  logs: DailyLog[];
}

interface ActiveCellInfo {
  x: string;
  y: string;
  value: number;
  color: string;
}

export function CorrelationStudy({ fields, logs }: CorrelationStudyProps) {
  const [selectedFieldA, setSelectedFieldA] = useState<string>("");
  const [selectedFieldB, setSelectedFieldB] = useState<string>("");
  const [activeCell, setActiveCell] = useState<ActiveCellInfo | null>(null);

  // Filter numeric/boolean fields for correlation
  const measurableFields = useMemo(() => {
    return fields.filter(f =>
      f.fieldType === FieldType.NUMBER ||
      f.fieldType === FieldType.BOOLEAN ||
      f.fieldType === FieldType.STRING
    );
  }, [fields]);

  const activeFieldA = selectedFieldA || measurableFields[0]?.id || "";
  const activeFieldB = selectedFieldB || measurableFields[1]?.id || "";

  // Dynamic mapping for string fields that don't have a predefined order
  const fieldMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};

    fields.forEach(field => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder && field.optionsOrder.length > 0) {
          field.optionsOrder.forEach((val, idx) => {
            valueMap[val] = idx;
          });
        } else {
          // Fallback: collect all unique values and sort them
          const uniqueValues = new Set<string>();
          logs.forEach(log => {
            const fv = log.fieldValues?.find(v => v.customFieldId === field.id);
            if (fv && fv.value) uniqueValues.add(fv.value);
          });
          Array.from(uniqueValues).sort().forEach((val, idx) => {
            valueMap[val] = idx;
          });
        }
        mappings[field.id] = valueMap;
      }
    });
    return mappings;
  }, [fields, logs]);

  // Helper to get numeric value for a field in a log
  const getVal = useCallback((log: DailyLog, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!field || !fv || fv.value === undefined || fv.value === null) return null;

    if (field.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    if (field.fieldType === FieldType.STRING) {
      const mapping = fieldMappings[fieldId];
      if (mapping && mapping[fv.value] !== undefined) {
        return mapping[fv.value];
      }
      return null;
    }
    return null;
  }, [fields, fieldMappings]);

  const matrixData = useMemo(() => {
    const data: { x: string; y: string; xId: string; yId: string; value: number; color: string }[] = [];
    measurableFields.forEach((fa) => {
      measurableFields.forEach((fb) => {
        const xValues: number[] = [];
        const yValues: number[] = [];

        logs.forEach(log => {
          const va = getVal(log, fa.id);
          const vb = getVal(log, fb.id);
          if (va !== null && vb !== null) {
            xValues.push(va);
            yValues.push(vb);
          }
        });

        const correlation = calculatePearsonCorrelation(xValues, yValues);
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
  }, [measurableFields, logs, getVal]);

  const getInterpretation = (val: number, nameA: string, nameB: string) => {
    if (nameA === nameB) return `C'est la corrélation d'une variable avec elle-même, elle est donc toujours égale à 1.`;
    if (Math.abs(val) < 0.2) return `Il n'y a pratiquement aucune relation linéaire visible entre "${nameA}" et "${nameB}".`;
    if (val > 0.7) return `Forte relation positive : quand "${nameA}" augmente, "${nameB}" a une très forte tendance à augmenter aussi.`;
    if (val > 0.4) return `Relation positive modérée : il semble y avoir un lien entre "${nameA}" et "${nameB}".`;
    if (val < -0.7) return `Forte relation négative : quand "${nameA}" augmente, "${nameB}" diminue de façon très marquée.`;
    if (val < -0.4) return `Relation négative modérée : quand "${nameA}" augmente, "${nameB}" a tendance à diminuer.`;
    return `Une relation légère a été détectée entre ces deux variables.`;
  };

  // Data for scatter plot
  const scatterData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];

    return logs.map(log => {
      const va = getVal(log, activeFieldA);
      const vb = getVal(log, activeFieldB);
      if (va !== null && vb !== null) {
        return { x: va, y: vb, date: new Date(log.logDate).toLocaleDateString() };
      }
      return null;
    }).filter((d): d is { x: number; y: number; date: string } => d !== null);
  }, [activeFieldA, activeFieldB, logs, getVal]);

  // Data for temporal comparison (Dual Line Chart)
  const temporalData = useMemo(() => {
    if (!activeFieldA || !activeFieldB) return [];

    return logs.map(log => {
      const va = getVal(log, activeFieldA);
      const vb = getVal(log, activeFieldB);
      return {
        date: new Date(log.logDate).toLocaleDateString(),
        [activeFieldA]: va,
        [activeFieldB]: vb,
        rawDate: new Date(log.logDate).getTime()
      };
    }).sort((a, b) => a.rawDate - b.rawDate);
  }, [activeFieldA, activeFieldB, logs, getVal]);

  const currentCorrelation = useMemo(() => {
    if (scatterData.length === 0) return 0;
    const x = scatterData.map(d => d.x);
    const y = scatterData.map(d => d.y);
    return calculatePearsonCorrelation(x, y);
  }, [scatterData]);

  return (
    <Box sx={{ mt: 4, position: "relative" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, textAlign: "center" }}>
        Étude de Corrélation
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* Correlation Matrix */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 4, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Matrice de Corrélation
            </Typography>

            <Box sx={{ overflowX: "auto", pb: 2, mb: 2, cursor: "grab", "&:active": { cursor: "grabbing" } }}>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${measurableFields.length}, 1fr)`,
                gap: { xs: 0.5, md: 1 },
                minWidth: Math.max(0, measurableFields.length * 45),
              }}>
                {matrixData.map((cell, idx) => (
                  <MuiTooltip key={idx} title={`${cell.x} vs ${cell.y}: ${cell.value}`} arrow disableHoverListener>
                    <Box
                      onClick={() => {
                        setSelectedFieldA(cell.xId);
                        setSelectedFieldB(cell.yId);
                        setActiveCell({ x: cell.x, y: cell.y, value: cell.value, color: cell.color });
                      }}
                      sx={{
                        aspectRatio: "1/1",
                        bgcolor: cell.color,
                        borderRadius: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        border: (activeFieldA === cell.xId && activeFieldB === cell.yId) ? "2px solid #000" : "none",
                        "&:hover": {
                          transform: "scale(1.1)",
                          zIndex: 2,
                        },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: Math.abs(cell.value) > 0.4 ? "white" : "text.primary", fontSize: "0.7rem" }}>
                        {cell.value}
                      </Typography>
                    </Box>
                  </MuiTooltip>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">Négative (-1)</Typography>
              <Box sx={{ flex: 1, mx: 2, height: 8, borderRadius: 4, background: "linear-gradient(to right, rgba(239, 68, 68, 1), rgba(156, 163, 175, 0.2), rgba(34, 197, 94, 1))" }} />
              <Typography variant="caption" color="text.secondary">Positive (+1)</Typography>
            </Box>

            {/* Absolute Explanation Card */}
            <Fade in={!!activeCell}>
              <Paper
                elevation={10}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: { xs: "90%", sm: "350px" },
                  p: 3,
                  borderRadius: 5,
                  zIndex: 100,
                  bgcolor: "white",
                  border: "1px solid rgba(0,0,0,0.1)",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Détails de Corrélation</Typography>
                  <IconButton size="small" onClick={() => setActiveCell(null)} sx={{ mt: -0.5, mr: -0.5 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: 2, bgcolor: activeCell?.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900 }}>
                    {activeCell?.value}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeCell?.x}</Typography>
                    <Typography variant="caption" color="text.secondary">vs</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeCell?.y}</Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ lineHeight: 1.5, color: "text.secondary", bgcolor: "grey.50", p: 2, borderRadius: 3 }}>
                  {activeCell && getInterpretation(activeCell.value, activeCell.x, activeCell.y)}
                </Typography>
              </Paper>
            </Fade>
          </Paper>
        </Grid>

        {/* Details & Scatter Chart */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", height: "100%", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 4, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Analyse Détaillée
            </Typography>

            <Box sx={{ display: "flex", gap: { xs: 1, md: 2 }, mb: 4, flexWrap: "wrap" }}>
              <FormControl fullWidth size="small">
                <InputLabel>Variable X</InputLabel>
                <Select value={activeFieldA} label="Variable X" onChange={(e) => setSelectedFieldA(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}>
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Variable Y</InputLabel>
                <Select value={activeFieldB} label="Variable Y" onChange={(e) => setSelectedFieldB(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}>
                  {measurableFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ textAlign: "center", mb: 3, p: 2, bgcolor: "rgba(99, 102, 241, 0.05)", borderRadius: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Coefficient de Corrélation (r)</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "1)"), fontSize: { xs: '2.5rem', md: '3rem' } }}>
                {currentCorrelation.toFixed(2)}
              </Typography>
            </Box>

            <ChartContainer aspect={1.5} mobileAspect={1.1} minHeight={300}>
              <ScatterChart margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="X"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Y"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  name="Logs"
                  data={scatterData}
                  fill={getCorrelationColor(currentCorrelation).replace(/[\d.]+\)$/, "0.8")}
                />
              </ScatterChart>
            </ChartContainer>
          </Paper>
        </Grid>

        {/* Temporal Comparison Chart */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 4, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              Comparaison des Fluctuations (Temporel)
            </Typography>
            <ChartContainer aspect={2.5} mobileAspect={1.3} minHeight={350}>
              <LineChart data={temporalData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                  interval={0}
                  tickFormatter={(val, index) => {
                    const item = temporalData[index];
                    const prevItem = temporalData[index - 1];
                    if (prevItem && prevItem.date === item?.date) return "";
                    return item?.date || "";
                  }}
                  minTickGap={10}
                />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} orientation="left" stroke="#6366f1" tick={{ fontSize: 9 }} width={20} />
                <YAxis yAxisId="right" axisLine={false} tickLine={false} orientation="right" stroke="#ec4899" tick={{ fontSize: 9 }} width={20} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                  formatter={(value: any, name: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const field = measurableFields.find(f => f.name === name);
                    if (!field) return value;

                    if (field.fieldType === FieldType.BOOLEAN) {
                      return value === 1 ? "Oui" : "Non";
                    }

                    if (field.fieldType === FieldType.STRING) {
                      const mapping = fieldMappings[field.id];
                      if (mapping) {
                        const label = Object.entries(mapping).find(([, val]) => val === value)?.[0];
                        return label || value;
                      }
                    }
                    return value;
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={activeFieldA}
                  name={measurableFields.find(f => f.id === activeFieldA)?.name || "Variable X"}
                  stroke="#6366f1"
                  strokeWidth={4}
                  strokeOpacity={0.8}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={activeFieldB}
                  name={measurableFields.find(f => f.id === activeFieldB)?.name || "Variable Y"}
                  stroke="#ec4899"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  strokeOpacity={0.8}
                  dot={{ r: 4, fill: "#ec4899" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center", fontStyle: "italic" }}>
              Ce graphique permet d&apos;observer visuellement si les deux variables &quot;bougent ensemble&quot; au fil du temps.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
