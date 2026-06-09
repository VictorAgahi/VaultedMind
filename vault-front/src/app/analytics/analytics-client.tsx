"use client";

import React, { useEffect, useCallback, useMemo, useState } from "react";
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
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  TextField,
  Button,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { Navbar } from "@/components/navbar/navbar";
import { apiService } from "@/services/api.service";
import { DailyLog, CustomField, FieldType } from "@/types";
import { EvolutionQualitativeChart } from "@/components/analytics/evolution-qualitative-chart";
import { TrendNumericalChart } from "@/components/analytics/trend-numerical-chart";
import { ValueDistributionChart } from "@/components/analytics/value-distribution-chart";
import { MultiTrendChart } from "@/components/analytics/multi-trend-chart";
import { CorrelationStudy } from "@/components/correlation-study/correlation-study";
import { AdvancedAnalyses } from "@/components/analytics/advanced-analyses";
import { HabitImpactStudy } from "@/components/analytics/habit-impact-study";
import { ResponsiveContainer } from "recharts";
import { formatHourlyValue } from "@/utils/time-converter";
import { Fade, useMediaQuery } from "@mui/material";

// ─── ChartContainer ───────────────────────────────────────────────────────────

interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
  fullHeight?: boolean;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  aspect,
  mobileAspect,
  minHeight,
  fullHeight,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!ref.current) return;
    const target = ref.current;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    ro.observe(target);
    return () => ro.unobserve(target);
  }, []);

  const finalAspect = isMobile && mobileAspect ? mobileAspect : aspect;
  // On mobile, reduce aspect ratio for better readability
  const mobileSafeAspect = isMobile ? Math.min(finalAspect, 1.2) : finalAspect;

  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight,
        flexGrow: fullHeight ? 1 : 0,
        height: fullHeight && !isMobile ? "100%" : "auto",
        display: fullHeight ? "flex" : "block",
        flexDirection: "column",
      }}
    >
      {width > 0 && (
        <ResponsiveContainer
          width={width}
          height={fullHeight && !isMobile ? "100%" : undefined}
          aspect={fullHeight && !isMobile ? undefined : mobileSafeAspect}
          debounce={50}
        >
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </Box>
  );
};

// ─── Date filter ─────────────────────────────────────────────────────────────

type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

interface DateFilterState {
  preset: DatePreset;
  customStart: string; // yyyy-MM-dd
  customEnd: string;   // yyyy-MM-dd
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nDaysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

interface DateFilterBarProps {
  filter: DateFilterState;
  onChange: (f: DateFilterState) => void;
}

function DateFilterBar({ filter, onChange }: DateFilterBarProps) {
  const [showCustom, setShowCustom] = useState(filter.preset === "custom");
  const [localStart, setLocalStart] = useState(filter.customStart || nDaysAgoStr(30));
  const [localEnd, setLocalEnd] = useState(filter.customEnd || todayStr());

  const handlePreset = (_: React.MouseEvent<HTMLElement>, value: DatePreset | null) => {
    if (!value) return;
    if (value === "custom") {
      setShowCustom(true);
      onChange({ preset: "custom", customStart: localStart, customEnd: localEnd });
    } else {
      setShowCustom(false);
      onChange({ preset: value, customStart: "", customEnd: "" });
    }
  };

  const applyCustom = () => {
    onChange({ preset: "custom", customStart: localStart, customEnd: localEnd });
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TuneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", whiteSpace: "nowrap" }}>
            Période
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={filter.preset}
          exclusive
          onChange={handlePreset}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              fontWeight: 700,
              fontSize: "0.8rem",
              px: { xs: 1.2, sm: 2 },
              py: 0.6,
              border: "1px solid rgba(0,0,0,0.1)",
              textTransform: "none",
              "&.Mui-selected": {
                bgcolor: "#6366f1",
                color: "white",
                "&:hover": { bgcolor: "#4f46e5" },
              },
            },
          }}
        >
          <ToggleButton value="7d">7 j</ToggleButton>
          <ToggleButton value="30d">30 j</ToggleButton>
          <ToggleButton value="90d">90 j</ToggleButton>
          <ToggleButton value="all">Tout</ToggleButton>
          <ToggleButton value="custom">Perso.</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Collapse in={showCustom} timeout={200}>
        <Box
          sx={{
            mt: 2, p: 2,
            bgcolor: "rgba(99,102,241,0.04)", borderRadius: 3, border: "1px solid rgba(99,102,241,0.12)",
            display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5,
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <TextField
            label="Du"
            type="date"
            size="small"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />
          <Typography variant="body2" sx={{ color: "text.secondary", px: 0.5, display: { xs: "none", sm: "block" } }}>→</Typography>
          <TextField
            label="Au"
            type="date"
            size="small"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={applyCustom}
            disableElevation
            sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" }, fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            Appliquer
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Analytics hook ───────────────────────────────────────────────────────────

interface ChartDataPoint {
  key: string;
  dateDisplay: string;
  value: number | null;
  label: string;
}

interface AnalyticsState {
  fields: CustomField[];
  logs: (DailyLog & { _ts?: number; _day?: number })[];
  loading: boolean;
  error: string | null;
  tabValue: number;
  selectedTrendField: string;
  selectedFreqField: string;
  selectedStringField: string;
  advSelectedField: string;
}

type AnalyticsAction =
  | { type: "SET_DATA"; fields: CustomField[]; logs: (DailyLog & { _ts?: number; _day?: number })[]; defaults: Partial<AnalyticsState> }
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

function filterLogsByDateFilter(
  logs: (DailyLog & { _ts?: number; _day?: number })[],
  filter: DateFilterState
): (DailyLog & { _ts?: number; _day?: number })[] {
  if (filter.preset === "all") return logs;

  if (filter.preset === "custom") {
    if (!filter.customStart || !filter.customEnd) return logs;
    const start = new Date(filter.customStart).getTime();
    const end = new Date(filter.customEnd + "T23:59:59").getTime();
    return logs.filter((l) => {
      const ts = l._ts ?? new Date(l.logDate).getTime();
      return ts >= start && ts <= end;
    });
  }

  const days = filter.preset === "7d" ? 7 : filter.preset === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return logs.filter((l) => (l._ts ?? 0) >= cutoff);
}

interface UseAnalyticsReturn {
  state: AnalyticsState;
  dispatch: React.Dispatch<AnalyticsAction>;
  fields: CustomField[];
  logs: (DailyLog & { _ts?: number; _day?: number })[];
  filteredLogs: (DailyLog & { _ts?: number; _day?: number })[];
  loading: boolean;
  error: string | null;
  tabValue: number;
  selectedTrendField: string;
  selectedFreqField: string;
  selectedStringField: string;
  trendData: ChartDataPoint[];
  freqData: Array<{ name: string; count: number }>;
  qualitativeData: { data: ChartDataPoint[]; valueMap: Record<string, number> };
  multiTrendData: Record<string, string | number | boolean | null>[];
}

const useAnalytics = (
  filter: DateFilterState
): UseAnalyticsReturn => {
  const [state, dispatch] = React.useReducer(analyticsReducer, {
    fields: [],
    logs: [],
    loading: true,
    error: null,
    tabValue: 0,
    selectedTrendField: "",
    selectedFreqField: "",
    selectedStringField: "",
    advSelectedField: "",
  });

  const { fields, logs, loading, error, tabValue, selectedTrendField, selectedFreqField, selectedStringField } = state;

  const fetchData = useCallback(async (signal: AbortSignal) => {
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal }),
      ]);

      const defaults: Partial<AnalyticsState> = {};
      const numF = fieldsData.filter((f) => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
      if (numF.length) defaults.selectedTrendField = numF[0].id;

      const strF = fieldsData.filter((f) => f.fieldType === FieldType.STRING || f.fieldType === FieldType.NUMBER);
      if (strF.length) defaults.selectedStringField = strF[0].id;

      const freqF = fieldsData.filter((f) => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);
      if (freqF.length) defaults.selectedFreqField = freqF[0].id;

      if (fieldsData.length) defaults.advSelectedField = fieldsData[0].id;

      const logsWithData = logsData.map((log) => {
        const dateObj = new Date(log.logDate);
        return { ...log, _ts: dateObj.getTime(), _day: dateObj.getDay() };
      });

      dispatch({
        type: "SET_DATA",
        fields: fieldsData,
        logs: logsWithData.sort((a, b) => a._ts - b._ts),
        defaults,
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

  const filteredLogs = useMemo(() => filterLogsByDateFilter(logs, filter), [logs, filter]);

  const fieldsMap = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);

  const trendData = useMemo<ChartDataPoint[]>(() => {
    if (!selectedTrendField || !filteredLogs.length) return [];
    const field = fieldsMap.get(selectedTrendField);
    if (!field) return [];

    const result: ChartDataPoint[] = [];
    const logsByDate = new Map<string, DailyLog[]>();
    filteredLogs.forEach((log) => {
      const d = new Date(log.logDate).toISOString().split("T")[0];
      if (!logsByDate.has(d)) logsByDate.set(d, []);
      logsByDate.get(d)?.push(log);
    });

    const minDate = new Date(filteredLogs[0].logDate);
    const maxDate = new Date(filteredLogs[filteredLogs.length - 1].logDate);

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      const dayLogs = logsByDate.get(dStr);
      const disp = d.toLocaleDateString();

      if (!dayLogs) {
        result.push({ key: `gap-${dStr}`, dateDisplay: disp, value: null, label: "" });
        continue;
      }

      const lastLog = dayLogs[dayLogs.length - 1];
      const fieldValueMap = new Map(lastLog.fieldValues?.map((fv) => [fv.customFieldId, fv.value]));
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
  }, [filteredLogs, selectedTrendField, fieldsMap]);

  const freqData = useMemo(() => {
    if (!selectedFreqField || !filteredLogs.length) return [];
    const field = fieldsMap.get(selectedFreqField);
    if (!field) return [];

    const counts: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      const v = log.fieldValues?.find((fv) => fv.customFieldId === selectedFreqField)?.value;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name: field.fieldType === FieldType.BOOLEAN ? (name === "true" ? "Oui" : "Non") : name,
      count,
    }));
  }, [filteredLogs, selectedFreqField, fieldsMap]);

  const qualitativeData = useMemo(() => {
    if (!selectedStringField || !filteredLogs.length) return { data: [], valueMap: {} };
    const field = fieldsMap.get(selectedStringField);
    if (!field) return { data: [], valueMap: {} };

    const valueMap: Record<string, number> = {};
    const isNumeric = field.fieldType === FieldType.NUMBER;

    if (isNumeric) {
      const uniqueVals = Array.from(
        new Set(
          filteredLogs.flatMap((l) => {
            const v = l.fieldValues?.find((fv) => fv.customFieldId === selectedStringField)?.value;
            const num = parseFloat(v || "");
            return !isNaN(num) ? [num] : [];
          })
        )
      ) as number[];
      uniqueVals.sort((a, b) => a - b);
      uniqueVals.forEach((v) => {
        const isHourly = (field.optionsOrder || []).includes("isHourly");
        const label = isHourly ? formatHourlyValue(v.toString()) : v.toString();
        valueMap[label] = v;
      });
    } else {
      if (field.optionsOrder?.length) {
        field.optionsOrder.forEach((opt, i) => { valueMap[opt] = i; });
      } else {
        const uniqueVals = Array.from(
          new Set(
            filteredLogs.flatMap((l) => {
              const v = l.fieldValues?.find((fv) => fv.customFieldId === selectedStringField)?.value;
              return v ? [v] : [];
            })
          )
        ) as string[];
        uniqueVals.sort().forEach((v, i) => { valueMap[v] = i; });
      }
    }

    const data = filteredLogs.reduce<ChartDataPoint[]>((acc, log) => {
      const v = log.fieldValues?.find((fv) => fv.customFieldId === selectedStringField)?.value;
      if (v && v !== "-") {
        const dateStr = new Date(log.logDate).toISOString().split("T")[0];
        const isHourly = isNumeric && (field.optionsOrder || []).includes("isHourly");
        let numericValue: number | null = null;
        let displayLabel = v;

        if (isNumeric) {
          const parsed = parseFloat(v);
          if (!isNaN(parsed)) {
            numericValue = parsed;
            displayLabel = isHourly ? formatHourlyValue(v) : v;
          }
        } else {
          numericValue = valueMap[v] ?? null;
        }

        acc.push({ key: dateStr, dateDisplay: new Date(log.logDate).toLocaleDateString(), value: numericValue, label: displayLabel });
      }
      return acc;
    }, []);

    return { data, valueMap };
  }, [filteredLogs, selectedStringField, fieldsMap]);

  const multiTrendData = useMemo(() => {
    if (!filteredLogs.length) return [];

    const logsByDate = new Map<string, DailyLog[]>();
    filteredLogs.forEach((log) => {
      const d = new Date(log.logDate).toISOString().split("T")[0];
      if (!logsByDate.has(d)) logsByDate.set(d, []);
      logsByDate.get(d)?.push(log);
    });

    const minDate = new Date(filteredLogs[0].logDate);
    const maxDate = new Date(filteredLogs[filteredLogs.length - 1].logDate);
    const result: Record<string, string | number | boolean | null>[] = [];

    const stringFieldMaps = new Map<string, Record<string, number>>();
    fields.forEach((field) => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder?.length) {
          field.optionsOrder.forEach((opt, i) => { valueMap[opt] = i; });
        } else {
          const uniqueVals = Array.from(
            new Set(
              filteredLogs.flatMap((l) => {
                const v = l.fieldValues?.find((fv) => fv.customFieldId === field.id)?.value;
                return v && v !== "-" ? [v] : [];
              })
            )
          ) as string[];
          uniqueVals.sort().forEach((v, i) => { valueMap[v] = i; });
        }
        stringFieldMaps.set(field.id, valueMap);
      }
    });

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      const dayLogs = logsByDate.get(dStr);
      const disp = d.toLocaleDateString();

      const point: Record<string, string | number | boolean | null> = { dateDisplay: disp, dateStr: dStr };
      const lastLog = dayLogs ? dayLogs[dayLogs.length - 1] : null;
      const fvMap = new Map<string, string>();
      if (lastLog?.fieldValues) lastLog.fieldValues.forEach((fv) => fvMap.set(fv.customFieldId, fv.value));

      fields.forEach((field) => {
        if (!lastLog) {
          point[field.id] = null;
        } else {
          const val = fvMap.get(field.id);
          if (val !== undefined && val !== "" && val !== "-") {
            if (field.fieldType === FieldType.BOOLEAN) point[field.id] = val === "true" ? 1 : 0;
            else if (field.fieldType === FieldType.NUMBER) point[field.id] = parseFloat(val);
            else if (field.fieldType === FieldType.STRING) {
              const vm = stringFieldMaps.get(field.id);
              point[field.id] = vm && val in vm ? vm[val] : null;
            } else {
              point[field.id] = null;
            }
          } else {
            point[field.id] = null;
          }
        }
      });
      result.push(point);
    }
    return result;
  }, [filteredLogs, fields]);

  return {
    state,
    dispatch,
    fields,
    logs,
    filteredLogs,
    loading,
    error,
    tabValue,
    selectedTrendField,
    selectedFreqField,
    selectedStringField,
    trendData,
    freqData,
    qualitativeData,
    multiTrendData,
  };
};

// ─── AnalyticsClient ──────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: "all",
    customStart: "",
    customEnd: "",
  });

  const {
    state,
    dispatch,
    fields,
    logs,
    filteredLogs,
    loading,
    error,
    tabValue,
    selectedTrendField,
    selectedFreqField,
    selectedStringField,
    trendData,
    freqData,
    qualitativeData,
    multiTrendData,
  } = useAnalytics(dateFilter);

  const SELECT_MENU_PROPS = {
    slotProps: {
      paper: {
        sx: {
          maxHeight: 300,
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "4px" },
        },
      },
    },
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth={false} sx={{ py: 6, px: { xs: 2, md: 3, lg: 4 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: "#142949", letterSpacing: "-0.02em" }}>
            Analyses
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Visualisez vos progrès et découvrez des corrélations.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

        {/* Date filter */}
        <DateFilterBar filter={dateFilter} onChange={setDateFilter} />

        {/* Count badge */}
        {dateFilter.preset !== "all" && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {filteredLogs.length} entrée{filteredLogs.length !== 1 ? "s" : ""} affichée{filteredLogs.length !== 1 ? "s" : ""}
              {" "}sur {logs.length} au total
            </Typography>
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: 6,
            overflow: "hidden",
            mb: 6,
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => dispatch({ type: "SET_TAB", value: v })}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : undefined}
            allowScrollButtonsMobile
            sx={{
              "& .MuiTab-root": { fontWeight: 700, py: 2, fontSize: { xs: "0.8rem", sm: "0.9rem" } },
              "& .Mui-selected": { color: "#6366f1" },
              "& .MuiTabs-indicator": { backgroundColor: "#6366f1", height: 3 },
            }}
          >
            <Tab label="Tendances" />
            <Tab label="Corrélation" />
            <Tab label="Analyses" />
            <Tab label="Impact Habitudes" />
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
                    stringFields={fields.filter((f) => f.fieldType === FieldType.STRING || f.fieldType === FieldType.NUMBER)}
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
                <Grid size={{ xs: 12 }}>
                  <MultiTrendChart
                    data={multiTrendData}
                    fields={fields}
                    logs={filteredLogs}
                    ChartContainer={ChartContainer}
                  />
                </Grid>
              </Grid>
            </Fade>
          )}

          {tabValue === 1 && (
            <Fade in={tabValue === 1} timeout={400}>
              <Box>
                <CorrelationStudy fields={fields} logs={filteredLogs} />
              </Box>
            </Fade>
          )}

          {tabValue === 2 && (
            <Fade in={tabValue === 2} timeout={400}>
              <Box>
                <AdvancedAnalyses
                  fields={fields}
                  logs={filteredLogs}
                  activeAdvField={state.advSelectedField || (fields.length > 0 ? fields[0].id : "")}
                  setAdvSelectedField={(id) => dispatch({ type: "SET_FIELD", key: "advSelectedField", id })}
                  ChartContainer={ChartContainer}
                />
              </Box>
            </Fade>
          )}

          {tabValue === 3 && (
            <Fade in={tabValue === 3} timeout={400}>
              <Box>
                <HabitImpactStudy fields={fields} logs={filteredLogs} ChartContainer={ChartContainer} />
              </Box>
            </Fade>
          )}
        </Box>
      </Container>
    </Box>
  );
}
