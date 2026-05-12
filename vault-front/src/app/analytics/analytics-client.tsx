"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Container,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Paper,
  useTheme
} from "@mui/material";
import { Navbar } from "@/components/navbar/navbar";
import { apiService } from "@/services/api.service";
import { DailyLog, CustomField, FieldType } from "@/types";
import { EvolutionQualitativeChart } from "@/components/analytics/evolution-qualitative-chart";
import { TrendNumericalChart } from "@/components/analytics/trend-numerical-chart";
import { ValueDistributionChart } from "@/components/analytics/value-distribution-chart";
import { CorrelationStudy } from "@/components/correlation-study/correlation-study";
import { AdvancedAnalyses } from "@/components/analytics/advanced-analyses";
import { ResponsiveContainer } from "recharts";

import { Fade, useMediaQuery } from "@mui/material";

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
  fullHeight?: boolean;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ children, aspect, mobileAspect, minHeight, fullHeight }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
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
    <Box ref={ref} sx={{
      width: "100%",
      minWidth: 0,
      minHeight,
      flexGrow: fullHeight ? 1 : 0,
      height: fullHeight && !isMobile ? "100%" : "auto",
      display: fullHeight ? "flex" : "block",
      flexDirection: "column"
    }}>
      {width > 0 && (
        <ResponsiveContainer
          width={width}
          height={fullHeight && !isMobile ? "100%" : undefined}
          aspect={fullHeight && !isMobile ? undefined : finalAspect}
          debounce={50}
        >
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </Box>
  );
};

interface ChartDataPoint {
  key: string;
  dateDisplay: string;
  value: number | null;
  label: string;
}

interface AnalyticsState {
  fields: CustomField[];
  logs: DailyLog[];
  loading: boolean;
  error: string | null;
  tabValue: number;
  selectedTrendField: string;
  selectedFreqField: string;
  selectedStringField: string;
  advSelectedField: string;
}

type AnalyticsAction =
  | { type: "SET_DATA"; fields: CustomField[]; logs: DailyLog[]; defaults: Partial<AnalyticsState> }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_TAB"; value: number }
  | { type: "SET_FIELD"; key: keyof AnalyticsState; id: string };

const analyticsReducer = (state: AnalyticsState, action: AnalyticsAction): AnalyticsState => {
  switch (action.type) {
    case "SET_DATA": return { ...state, ...action.defaults, fields: action.fields, logs: action.logs, loading: false, error: null };
    case "SET_LOADING": return { ...state, loading: action.loading };
    case "SET_ERROR": return { ...state, error: action.error, loading: false };
    case "SET_TAB": return { ...state, tabValue: action.value };
    case "SET_FIELD": return { ...state, [action.key]: action.id };
    default: return state;
  }
};

export default function AnalyticsClient() {
  const [state, dispatch] = React.useReducer(analyticsReducer, {
    fields: [],
    logs: [],
    loading: true,
    error: null,
    tabValue: 0,
    selectedTrendField: "",
    selectedFreqField: "",
    selectedStringField: "",
    advSelectedField: ""
  });

  const { fields, logs, loading, error, tabValue, selectedTrendField, selectedFreqField, selectedStringField } = state;

  const fetchData = useCallback(async (signal: AbortSignal) => {
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal })
      ]);

      const defaults: Partial<AnalyticsState> = {};
      const numF = fieldsData.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
      if (numF.length) defaults.selectedTrendField = numF[0].id;

      const strF = fieldsData.filter(f => f.fieldType === FieldType.STRING);
      if (strF.length) defaults.selectedStringField = strF[0].id;

      const freqF = fieldsData.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);
      if (freqF.length) defaults.selectedFreqField = freqF[0].id;

      if (fieldsData.length) defaults.advSelectedField = fieldsData[0].id;

      const logsWithData = logsData.map(log => {
        const dateObj = new Date(log.logDate);
        return {
          ...log,
          _ts: dateObj.getTime(),
          _day: dateObj.getDay()
        };
      });

      dispatch({
        type: "SET_DATA",
        fields: fieldsData,
        logs: logsWithData.sort((a, b) => a._ts - b._ts),
        defaults
      });
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") dispatch({ type: "SET_ERROR", error: "Échec du chargement" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const fieldsMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

  const trendData = useMemo<ChartDataPoint[]>(() => {
    if (!selectedTrendField || !logs.length) return [];
    const field = fieldsMap.get(selectedTrendField);
    if (!field) return [];

    const result: ChartDataPoint[] = [];
    const logsByDate = new Map<string, DailyLog[]>();
    logs.forEach(log => {
      const d = new Date(log.logDate).toISOString().split("T")[0];
      if (!logsByDate.has(d)) logsByDate.set(d, []);
      logsByDate.get(d)?.push(log);
    });

    const minDate = new Date(logs[0].logDate);
    const maxDate = new Date(logs[logs.length - 1].logDate);

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      const dayLogs = logsByDate.get(dStr);
      const disp = d.toLocaleDateString();

      if (!dayLogs) {
        result.push({ key: `gap-${dStr}`, dateDisplay: disp, value: null, label: "" });
        continue;
      }

      const lastLog = dayLogs[dayLogs.length - 1];
      const fieldValueMap = new Map(lastLog.fieldValues?.map(fv => [fv.customFieldId, fv.value]));
      const v = fieldValueMap.get(selectedTrendField);

      if (v === undefined) {
        result.push({ key: `missing-${dStr}`, dateDisplay: disp, value: null, label: "" });
      } else if (field.fieldType === FieldType.BOOLEAN) {
        result.push({ key: dStr, dateDisplay: disp, value: v === "true" ? 1 : 0, label: v === "true" ? "Oui" : "Non" });
      } else {
        result.push({ key: dStr, dateDisplay: disp, value: parseFloat(v), label: v });
      }
    }
    return result;
  }, [logs, selectedTrendField, fieldsMap]);

  const freqData = useMemo(() => {
    if (!selectedFreqField || !logs.length) return [];
    const field = fieldsMap.get(selectedFreqField);
    if (!field) return [];

    const counts: Record<string, number> = {};
    logs.forEach(log => {
      const v = log.fieldValues?.find(fv => fv.customFieldId === selectedFreqField)?.value;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name: field.fieldType === FieldType.BOOLEAN ? (name === "true" ? "Oui" : "Non") : name,
      count
    }));
  }, [logs, selectedFreqField, fieldsMap]);

  const qualitativeData = useMemo(() => {
    if (!selectedStringField || !logs.length) return { data: [], valueMap: {} };
    const field = fieldsMap.get(selectedStringField);
    if (!field) return { data: [], valueMap: {} };

    const valueMap: Record<string, number> = {};
    if (field.optionsOrder?.length) {
      field.optionsOrder.forEach((opt, i) => { valueMap[opt] = i; });
    } else {
      const uniqueVals = Array.from(new Set(logs.flatMap(l => {
        const v = l.fieldValues?.find(fv => fv.customFieldId === selectedStringField)?.value;
        return v ? [v] : [];
      }))) as string[];
      uniqueVals.sort().forEach((v, i) => { valueMap[v] = i; });
    }

    const data = logs.reduce<ChartDataPoint[]>((acc, log) => {
      const v = log.fieldValues?.find(fv => fv.customFieldId === selectedStringField)?.value;
      if (v && v !== "-") {
        const dateStr = new Date(log.logDate).toISOString().split("T")[0];
        acc.push({
          key: dateStr,
          dateDisplay: new Date(log.logDate).toLocaleDateString(),
          value: valueMap[v] ?? null,
          label: v
        });
      }
      return acc;
    }, []);

    return { data, valueMap };
  }, [logs, selectedStringField, fieldsMap]);

  const SELECT_MENU_PROPS = {
    slotProps: {
      paper: {
        sx: {
          maxHeight: 300,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }
        }
      }
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><CircularProgress size={60} thickness={4} /></Box>;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, md: 3, lg: 4 } }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: "#142949", letterSpacing: "-0.02em" }}>Analyses</Typography>
          <Typography variant="h6" color="text.secondary">Visualisez vos progrès et découvrez des corrélations.</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

        <Paper elevation={0} sx={{ borderRadius: 6, overflow: "hidden", mb: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => dispatch({ type: "SET_TAB", value: v })}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { fontWeight: 700, py: 2, fontSize: '0.9rem' },
              '& .Mui-selected': { color: '#6366f1' },
              '& .MuiTabs-indicator': { backgroundColor: '#6366f1', height: 3 }
            }}
          >
            <Tab label="Tendances" />
            <Tab label="Corrélation" />
            <Tab label="Analyses" />
          </Tabs>
        </Paper>

        <Box sx={{ minHeight: 600 }}>
          {tabValue === 0 && (
            <Fade in={tabValue === 0} timeout={400}>
              <Grid container spacing={{ xs: 2, md: 4 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <EvolutionQualitativeChart
                    data={qualitativeData.data}
                    valueMap={qualitativeData.valueMap}
                    selectedField={selectedStringField}
                    setSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "selectedStringField", id })}
                    stringFields={fields.filter(f => f.fieldType === FieldType.STRING)}
                    ChartContainer={ChartContainer}
                    menuProps={SELECT_MENU_PROPS}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <ValueDistributionChart
                    data={freqData}
                    selectedField={selectedFreqField}
                    setSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "selectedFreqField", id })}
                    stringAndBoolFields={fields}
                    ChartContainer={ChartContainer}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TrendNumericalChart
                    data={trendData}
                    selectedField={selectedTrendField}
                    setSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "selectedTrendField", id })}
                    fields={fields}
                    ChartContainer={ChartContainer}
                  />
                </Grid>
              </Grid>
            </Fade>
          )}

          {tabValue === 1 && (
            <Fade in={tabValue === 1} timeout={400}>
              <Box>
                <CorrelationStudy fields={fields} logs={logs} />
              </Box>
            </Fade>
          )}

          {tabValue === 2 && (
            <Fade in={tabValue === 2} timeout={400}>
              <Box>
                <AdvancedAnalyses
                  fields={fields}
                  logs={logs}
                  activeAdvField={state.advSelectedField || (fields.length > 0 ? fields[0].id : "")}
                  setAdvSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "advSelectedField", id })}
                  ChartContainer={ChartContainer}
                />
              </Box>
            </Fade>
          )}
        </Box>
      </Container>
    </Box>
  );
}
