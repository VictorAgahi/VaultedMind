"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tabs,
  Tab,
  Fade,
  Tooltip as MuiTooltip,
  useTheme,
  useMediaQuery
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { CorrelationStudy } from "@/components/organisms/correlation-study/correlation-study";
import { apiService } from "@/services/api.service";
import { CustomField, DailyLog, FieldType } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
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

interface ChartDataEntry {
  key: string;
  dateDisplay: string;
  value: number | null;
  label: string;
}

export default function AnalyticsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Selected fields for the two charts
  const [selectedTrendField, setSelectedTrendField] = useState<string>("");
  const [selectedFreqField, setSelectedFreqField] = useState<string>("");
  const [selectedStringField, setSelectedStringField] = useState<string>("");

  const fetchData = useCallback(async (signal: AbortSignal) => {
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal })
      ]);
      setFields(fieldsData);
      setLogs(logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()));
      setError(null);

      // Auto-select initial fields
      const numberFields = fieldsData.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
      if (numberFields.length > 0) setSelectedTrendField(numberFields[0].id);

      const stringFields = fieldsData.filter(f => f.fieldType === FieldType.STRING);
      if (stringFields.length > 0) setSelectedStringField(stringFields[0].id);

      const stringAndBoolFields = fieldsData.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);
      if (stringAndBoolFields.length > 0) setSelectedFreqField(stringAndBoolFields[0].id);

    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError("Échec du chargement des données d'analyse");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  const trendData = useMemo(() => {
    if (!selectedTrendField || logs.length === 0) return [];
    const field = fields.find(f => f.id === selectedTrendField);
    if (!field) return [];

    const sortedLogs = [...logs].sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    const result: ChartDataEntry[] = [];
    const logsByDate: Record<string, DailyLog[]> = {};

    sortedLogs.forEach(log => {
      const dateStr = new Date(log.logDate).toISOString().split("T")[0];
      if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
      logsByDate[dateStr].push(log);
    });

    const minDate = new Date(sortedLogs[0].logDate);
    const maxDate = new Date(sortedLogs[sortedLogs.length - 1].logDate);

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayLogs = logsByDate[dateStr];
      const displayDate = d.toLocaleDateString();

      if (!dayLogs || dayLogs.length === 0) {
        result.push({
          key: `gap-${dateStr}`,
          dateDisplay: displayDate,
          value: null,
          label: ""
        });
      } else {
        dayLogs.forEach((log, idx) => {
          const fv = log.fieldValues?.find(v => v.customFieldId === selectedTrendField);
          let value: number | null = null;
          if (fv) {
            if (field.fieldType === FieldType.NUMBER) value = parseFloat(fv.value);
            else if (field.fieldType === FieldType.BOOLEAN) value = fv.value === "true" ? 1 : 0;
          }

          result.push({
            key: `${log.id || `log-${dateStr}-${idx}`}`,
            dateDisplay: displayDate,
            value: isNaN(value as number) ? null : value,
            label: field?.fieldType === FieldType.BOOLEAN ? (value === 1 ? "Oui" : "Non") : (value !== null ? value.toString() : "")
          });
        });
      }
    }
    return result;
  }, [logs, selectedTrendField, fields]);

  const freqData = useMemo(() => {
    if (!selectedFreqField) return [];

    const counts: Record<string, number> = {};
    logs.forEach(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedFreqField);
      if (fv && fv.value) {
        let displayVal = fv.value;
        const field = fields.find(f => f.id === selectedFreqField);
        if (field?.fieldType === FieldType.BOOLEAN) {
          displayVal = fv.value === "true" ? "Oui" : "Non";
        }
        counts[displayVal] = (counts[displayVal] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [logs, selectedFreqField, fields]);

  // Data for String Evolution Chart
  const stringEvolutionData = useMemo(() => {
    if (!selectedStringField || logs.length === 0) return { data: [], valueMap: {} };

    const field = fields.find(f => f.id === selectedStringField);
    if (!field) return { data: [], valueMap: {} };

    const valueMap: Record<string, number> = {};
    const customOrder = field.optionsOrder;

    if (customOrder && customOrder.length > 0) {
      customOrder.forEach((val, idx) => { valueMap[val] = idx; });
    } else {
      const uniqueValues: Set<string> = new Set();
      logs.forEach(log => {
        const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
        if (fv && fv.value) uniqueValues.add(fv.value);
      });
      Array.from(uniqueValues).sort().forEach((val, idx) => { valueMap[val] = idx; });
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
    const result: ChartDataEntry[] = [];
    const logsByDate: Record<string, DailyLog[]> = {};

    sortedLogs.forEach(log => {
      const dateStr = new Date(log.logDate).toISOString().split("T")[0];
      if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
      logsByDate[dateStr].push(log);
    });

    const minDate = new Date(sortedLogs[0].logDate);
    const maxDate = new Date(sortedLogs[sortedLogs.length - 1].logDate);

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayLogs = logsByDate[dateStr];
      const displayDate = d.toLocaleDateString();

      if (!dayLogs || dayLogs.length === 0) {
        result.push({
          key: `gap-${dateStr}`,
          dateDisplay: displayDate,
          value: null,
          label: ""
        });
      } else {
        dayLogs.forEach((log, idx) => {
          const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
          let value: number | null = null;
          let label = "";

          if (fv && fv.value && valueMap[fv.value] !== undefined) {
            value = valueMap[fv.value];
            label = fv.value;
          }

          result.push({
            key: `${log.id || `log-str-${dateStr}-${idx}`}`,
            dateDisplay: displayDate,
            value,
            label
          });
        });
      }
    }

    return { data: result, valueMap };
  }, [logs, selectedStringField, fields]);

  const stringFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.STRING), [fields]);
  const numberAndBoolFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN), [fields]);
  const stringAndBoolFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN), [fields]);

  const [advSelectedField, setAdvSelectedField] = useState<string>("");
  const activeAdvField = advSelectedField || fields[0]?.id || "";

  const advFieldMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};
    fields.forEach(field => {
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
  }, [fields, logs]);

  const getAdvVal = useCallback((log: DailyLog, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!field || !fv || fv.value === undefined || fv.value === null) return null;

    if (field.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    if (field.fieldType === FieldType.STRING) {
      return advFieldMappings[fieldId]?.[fv.value] ?? null;
    }
    return null;
  }, [fields, advFieldMappings]);

  const weeklyProfileData = useMemo(() => {
    if (!activeAdvField) return [];

    const dayTotals: Record<number, { sum: number, count: number }> = {
      0: { sum: 0, count: 0 }, // Dimanche
      1: { sum: 0, count: 0 }, // Lundi
      2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
      6: { sum: 0, count: 0 }
    };

    const field = fields.find(f => f.id === activeAdvField);
    if (!field) return [];

    logs.forEach(log => {
      const val = getAdvVal(log, activeAdvField);
      if (val !== null) {
        const day = new Date(log.logDate).getDay();
        dayTotals[day].sum += val;
        dayTotals[day].count += 1;
      }
    });

    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((label, index) => ({
      subject: label,
      A: dayTotals[index].count > 0 ? parseFloat((dayTotals[index].sum / dayTotals[index].count).toFixed(2)) : 0,
      fullMark: 10
    }));
  }, [logs, activeAdvField, fields, getAdvVal]);

  const statsSummary = useMemo(() => {
    if (!activeAdvField) return null;
    const values = logs
      .map(log => getAdvVal(log, activeAdvField))
      .filter((v): v is number => v !== null);

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0; // Coeff de variation

    return {
      mean: mean.toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      volatility: cv.toFixed(1),
      count: values.length
    };
  }, [logs, activeAdvField, getAdvVal]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9", pb: 8 }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Box sx={{ mb: { xs: 4, md: 6 }, textAlign: "center" }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{
            fontWeight: 900,
            color: "#1a1a1a",
            letterSpacing: "-0.02em",
            fontSize: { xs: '2.5rem', md: '3.75rem' }
          }}>
            Tableau de Bord Analytique
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", px: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Décryptez vos habitudes et découvrez les corrélations invisibles qui influencent votre bien-être.
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 3, md: 4 }, display: 'flex', justifyContent: 'center' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#6366f1' },
              '& .MuiTab-root': { fontWeight: 700, fontSize: { xs: '0.875rem', md: '1rem' }, px: { xs: 2, md: 4 }, minWidth: 'auto' }
            }}
          >
            <Tab label="Évolutions" />
            <Tab label="Corrélations" />
            <Tab label="Avancé" />
          </Tabs>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
            <CircularProgress thickness={5} size={60} sx={{ color: "#6366f1" }} />
          </Box>
        ) : (
          <>
            {tabValue === 0 && (
              <Fade in={tabValue === 0}>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12 }}>
                    <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Évolution Qualitative</Typography>
                        <FormControl sx={{ minWidth: { xs: "100%", sm: 260 } }} size="small">
                          <InputLabel>Champ de texte</InputLabel>
                          <Select
                            value={selectedStringField}
                            label="Champ de texte"
                            onChange={(e) => setSelectedStringField(e.target.value)}
                            sx={{ borderRadius: 3 }}
                            MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}
                          >
                            {stringFields.map(f => (
                              <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      {stringEvolutionData.data.length > 0 ? (
                        <>
                          <ChartContainer aspect={2} mobileAspect={1.2} minHeight={300}>
                            <LineChart data={stringEvolutionData.data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                              <XAxis
                                dataKey="key"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10 }}
                                tickFormatter={(val, index) => {
                                  const item = stringEvolutionData.data[index];
                                  const prevItem = stringEvolutionData.data[index - 1];
                                  if (prevItem && prevItem.dateDisplay === item?.dateDisplay) return "";
                                  return item?.dateDisplay || "";
                                }}
                                minTickGap={10}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10 }}
                                width={80}
                                domain={[0, 'auto']}
                                tickFormatter={(value) => {
                                  const labels = Object.entries(stringEvolutionData.valueMap);
                                  const label = labels.find(([, idx]) => idx === value)?.[0] || "";
                                  return label.length > 12 ? label.substring(0, 10) + "..." : label;
                                }}
                              />
                              <RechartsTooltip
                                shared={false}
                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                                labelFormatter={(_, payload) => payload[0]?.payload?.dateDisplay || ""}
                                formatter={(value: any, name: any, props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                                  return [props.payload.label || value, "Valeur"];
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#f59e0b"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 8 }}
                                connectNulls={false}
                                animationDuration={1000}
                              />
                            </LineChart>
                          </ChartContainer>
                          <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
                            {Object.entries(stringEvolutionData.valueMap).sort(([, a], [, b]) => a - b).map(([label, idx]) => (
                              <Box key={label} sx={{ px: 2, py: 0.5, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 2, border: "1px solid rgba(0,0,0,0.05)", fontSize: "0.75rem", fontWeight: 600 }}>
                                {idx}: {label}
                              </Box>
                            ))}
                          </Box>
                        </>
                      ) : <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}><Typography color="text.secondary">Données insuffisantes</Typography></Box>}
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, height: "100%", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>Tendances Numériques</Typography>
                        <FormControl fullWidth size="small">
                          <InputLabel>Mesure</InputLabel>
                          <Select value={selectedTrendField} label="Mesure" onChange={(e) => setSelectedTrendField(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}>
                            {numberAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                      <ChartContainer aspect={2.5} mobileAspect={1.5} minHeight={250}>
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                          <XAxis
                            dataKey="key"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 10 }}
                            tickFormatter={(val, index) => {
                              const item = trendData[index];
                              const prevItem = trendData[index - 1];
                              if (prevItem && prevItem.dateDisplay === item?.dateDisplay) return "";
                              return item?.dateDisplay || "";
                            }}
                            minTickGap={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10 }}
                            domain={[0, 'auto']}
                            ticks={fields.find(f => f.id === selectedTrendField)?.fieldType === FieldType.BOOLEAN ? [0, 1] : undefined}
                            tickFormatter={(value) => {
                              const field = fields.find(f => f.id === selectedTrendField);
                              if (field?.fieldType === FieldType.BOOLEAN) {
                                return value === 1 ? "Oui" : "Non";
                              }
                              return value;
                            }}
                          />
                          <RechartsTooltip
                            shared={false}
                            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                            labelFormatter={(_, payload) => payload[0]?.payload?.dateDisplay || ""}
                            formatter={(value: any, name: any, props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                              return [props.payload.label || value, "Valeur"];
                            }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} connectNulls={false} animationDuration={1000} />
                        </LineChart>
                      </ChartContainer>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, height: "100%", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>Répartition des Valeurs</Typography>
                        <FormControl fullWidth size="small">
                          <InputLabel>Champ</InputLabel>
                          <Select value={selectedFreqField} label="Champ" onChange={(e) => setSelectedFreqField(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}>
                            {stringAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                      <ChartContainer aspect={2.5} mobileAspect={1.5} minHeight={250}>
                        <BarChart data={freqData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10 }}
                            interval={0}
                          />
                          <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 12, border: "none" }} />
                          <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </Paper>
                  </Grid>
                </Grid>
              </Fade>
            )}

            {tabValue === 1 && (
              <Fade in={tabValue === 1}>
                <Box>
                  <CorrelationStudy fields={fields} logs={logs} />
                </Box>
              </Fade>
            )}

            {tabValue === 2 && (
              <Fade in={tabValue === 2}>
                <Box>
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>Profil Hebdomadaire</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                          <InputLabel>Champ à analyser</InputLabel>
                          <Select value={activeAdvField} label="Champ à analyser" onChange={(e) => setAdvSelectedField(e.target.value)} sx={{ borderRadius: 3 }} MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}>
                            {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>

                        <ChartContainer aspect={1} mobileAspect={1.1} minHeight={300}>
                          <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "65%" : "80%"} data={weeklyProfileData}>
                            <PolarGrid stroke="rgba(0,0,0,0.05)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                            <Radar
                              name="Moyenne"
                              dataKey="A"
                              stroke="#6366f1"
                              fill="#6366f1"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ChartContainer>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
                          Moyenne par jour de la semaine
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                      <Grid container spacing={4}>
                        <Grid size={{ xs: 12 }}>
                          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", bgcolor: "rgba(99, 102, 241, 0.03)" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>Indicateurs de Stabilité</Typography>
                            {statsSummary ? (
                              <Grid container spacing={2}>
                                {[
                                  { label: "Moyenne", value: statsSummary.mean, color: "#6366f1" },
                                  { label: "Min", value: statsSummary.min, color: "#94a3b8" },
                                  { label: "Max", value: statsSummary.max, color: "#94a3b8" },
                                ].map((stat, i) => (
                                  <Grid size={{ xs: 4 }} key={i}>
                                    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(0,0,0,0.03)" }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600, fontSize: { xs: '0.65rem', md: '0.75rem' } }}>{stat.label}</Typography>
                                      <Typography variant="h6" sx={{ fontWeight: 900, color: stat.color, fontSize: { xs: '1rem', md: '1.25rem' } }}>{stat.value}</Typography>
                                    </Box>
                                  </Grid>
                                ))}
                                <Grid size={{ xs: 12 }}>
                                  <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(0,0,0,0.03)" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 1 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Variabilité (CV)</Typography>
                                      <MuiTooltip title="Le Coefficient de Variation (CV) mesure l'irrégularité. < 20% = Stable, > 50% = Très variable." arrow>
                                        <Box sx={{ display: "flex", alignItems: "center", cursor: "help" }}>
                                          <InfoIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                        </Box>
                                      </MuiTooltip>
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#ec4899" }}>{statsSummary.volatility}%</Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            ) : (
                              <Typography color="text.secondary">Pas assez de données pour générer les statistiques.</Typography>
                            )}
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>Conseil de l&apos;expert</Typography>
                            <Typography variant="body1" sx={{ fontStyle: "italic", color: "text.secondary", lineHeight: 1.6, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                              {parseFloat(statsSummary?.volatility || "0") > 30
                                ? "Votre routine semble très variable. Pour améliorer votre bien-être, essayez de stabiliser vos habitudes, notamment sur les jours où les pics sont les plus marqués."
                                : "Vous avez une excellente régularité ! Continuez ainsi pour maintenir un équilibre stable."}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>
              </Fade>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
