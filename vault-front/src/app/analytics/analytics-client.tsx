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
import dynamic from "next/dynamic";

const EvolutionQualitativeChart = dynamic(() => import("@/components/analytics/evolution-qualitative-chart").then(m => m.EvolutionQualitativeChart), { ssr: false });
const TrendNumericalChart = dynamic(() => import("@/components/analytics/trend-numerical-chart").then(m => m.TrendNumericalChart), { ssr: false });
const ValueDistributionChart = dynamic(() => import("@/components/analytics/value-distribution-chart").then(m => m.ValueDistributionChart), { ssr: false });
const CorrelationStudy = dynamic(() => import("@/components/correlation-study/correlation-study").then(m => m.CorrelationStudy), { ssr: false });

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ children, aspect, mobileAspect, minHeight }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        paddingBottom: `${(1 / (mobileAspect ?? aspect)) * 100}%`,
        height: 0,
        minHeight: minHeight,
        [theme.breakpoints.up("sm")]: {
          paddingBottom: `${(1 / aspect) * 100}%`
        }
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {children}
      </Box>
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

      dispatch({
        type: "SET_DATA",
        fields: fieldsData,
        logs: logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()),
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

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><CircularProgress size={60} thickness={4} /></Box>;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, color: "#142949" }}>Analyses</Typography>
          <Typography variant="h6" color="text.secondary">Visualisez vos progrès et découvrez des corrélations.</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

        <Paper sx={{ borderRadius: 4, overflow: "hidden", mb: 4, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <Tabs value={tabValue} onChange={(_, v) => dispatch({ type: "SET_TAB", value: v })} variant="fullWidth">
            <Tab label="Tendances & Répartition" sx={{ fontWeight: 700, py: 2 }} />
            <Tab label="Étude de Corrélation" sx={{ fontWeight: 700, py: 2 }} />
          </Tabs>
        </Paper>

        {tabValue === 0 ? (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <EvolutionQualitativeChart
                data={qualitativeData.data}
                valueMap={qualitativeData.valueMap}
                selectedField={selectedStringField}
                setSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "selectedStringField", id })}
                stringFields={fields.filter(f => f.fieldType === FieldType.STRING)}
                ChartContainer={ChartContainer}
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
        ) : (
          <CorrelationStudy fields={fields} logs={logs} />
        )}
      </Container>
    </Box>
  );
}
