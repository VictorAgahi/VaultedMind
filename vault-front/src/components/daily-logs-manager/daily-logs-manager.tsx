"use client";

import React, { useEffect, useMemo, useCallback, startTransition } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
  Tabs,
  Tab,
  IconButton
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ListIcon from "@mui/icons-material/List";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { apiService } from "@/services/api.service";
import {
  AppError,
  CustomField,
  DailyLog,
  FieldType,
} from "@/types";
import { parseHourlyValue, formatHourlyValue } from "@/utils/time-converter";
import { LogEntryDialog } from "./log-entry-dialog";
import { LogTable } from "./log-table";

interface State {
  logs: DailyLog[];
  fields: CustomField[];
  loading: boolean;
  error: string | null;
  dialog: {
    open: boolean;
    isEditing: boolean;
    logId: string | null;
    submitting: boolean;
  };
  formData: {
    date: string;
    notes: string;
    fieldValues: Record<string, string>;
  };
  filters: {
    selectedFields: string[];
    sortOrder: "asc" | "desc";
  };
}

type Action =
  | { type: "SET_DATA"; fields: CustomField[]; logs: DailyLog[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "OPEN_DIALOG"; isEditing: boolean; logId?: string | null; formData?: State["formData"] }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "UPDATE_FORM"; data: Partial<State["formData"]> }
  | { type: "UPDATE_FILTERS"; data: Partial<State["filters"]> };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_DATA": return { ...state, fields: action.fields, logs: action.logs, loading: false, error: null };
    case "SET_LOADING": return { ...state, loading: action.loading };
    case "SET_ERROR": return { ...state, error: action.error, loading: false };
    case "OPEN_DIALOG": return {
      ...state,
      dialog: { ...state.dialog, open: true, isEditing: action.isEditing, logId: action.logId || null },
      formData: action.formData || { date: new Date().toISOString().split("T")[0], notes: "", fieldValues: {} }
    };
    case "CLOSE_DIALOG": return { ...state, dialog: { ...state.dialog, open: false } };
    case "SET_SUBMITTING": return { ...state, dialog: { ...state.dialog, submitting: action.submitting } };
    case "UPDATE_FORM": return { ...state, formData: { ...state.formData, ...action.data } };
    case "UPDATE_FILTERS": return { ...state, filters: { ...state.filters, ...action.data } };
    default: return state;
  }
};



interface LogCalendarViewProps {
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  calendarDays: Array<{ dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }>;
  handleCalendarCellClick: (day: { dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }) => void;
}

const LogCalendarView: React.FC<LogCalendarViewProps> = ({
  calendarDate,
  setCalendarDate,
  calendarDays,
  handleCalendarCellClick
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      {/* Month Selector Panel */}
      <Box sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 3,
        p: 1.5,
        borderRadius: 3,
        bgcolor: "rgba(99, 102, 241, 0.03)",
        border: "1px solid rgba(99, 102, 241, 0.08)"
      }}>
        <IconButton
          size="small"
          onClick={() => {
            setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
          }}
          sx={{ bgcolor: "background.paper", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
        >
          <ChevronLeftIcon />
        </IconButton>

        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#142949", textTransform: "capitalize" }}>
          {calendarDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </Typography>

        <IconButton
          size="small"
          onClick={() => {
            setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
          }}
          sx={{ bgcolor: "background.paper", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Weekday headers */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: { xs: 0.5, sm: 1, md: 1.5 },
        textAlign: "center",
        mb: 1.5,
        bgcolor: "rgba(0,0,0,0.02)",
        py: 1,
        borderRadius: 2
      }}>
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dayName) => (
          <Typography key={dayName} variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
            {dayName}
          </Typography>
        ))}
      </Box>

      {/* Days Grid */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: { xs: 0.5, sm: 1, md: 1.5 }
      }}>
        {calendarDays.map((day) => {
          if (day.dayNum === 0) {
            return <Box key={day.dateStr} sx={{ aspectRatio: { xs: "1", md: "1.2" } }} />;
          }

          return (
            <Tooltip
              key={day.dateStr}
              title={day.isLogged ? `Modifier le journal du ${new Date(day.dateStr).toLocaleDateString("fr-FR")}` : `Ajouter un journal pour le ${new Date(day.dateStr).toLocaleDateString("fr-FR")}`}
              arrow
            >
              <Box
                onClick={() => handleCalendarCellClick(day)}
                sx={{
                  aspectRatio: { xs: "1", md: "1.2" },
                  borderRadius: { xs: 1.5, md: 3 },
                  display: "flex",
                  flexDirection: { xs: "row", md: "column" },
                  justifyContent: { xs: "center", md: "space-between" },
                  alignItems: "center",
                  p: { xs: 0.5, sm: 1, md: 1.5 },
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  bgcolor: day.isLogged ? "rgba(16, 185, 129, 0.05)" : "background.paper",
                  border: day.isLogged
                    ? "1.5px solid rgba(16, 185, 129, 0.3)"
                    : "1.5px dashed rgba(0, 0, 0, 0.08)",
                  color: day.isLogged ? "#10b981" : "text.secondary",
                  position: "relative",
                  '&:hover': {
                    transform: "scale(1.03)",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
                    borderColor: day.isLogged ? "#10b981" : "#6366f1",
                    bgcolor: day.isLogged ? "rgba(16, 185, 129, 0.08)" : "rgba(99, 102, 241, 0.04)",
                    color: day.isLogged ? "#059669" : "#6366f1"
                  }
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: { xs: 11, md: 14 } }}>
                  {day.dayNum}
                </Typography>

                <Box sx={{ display: { xs: "none", md: "flex" }, alignSelf: "flex-end", alignItems: "center" }}>
                  {day.isLogged ? (
                    <CheckCircleIcon sx={{ fontSize: { xs: 14, md: 18 }, color: "#10b981" }} />
                  ) : (
                    <AddIcon sx={{ fontSize: { xs: 14, md: 18 }, opacity: 0.3 }} />
                  )}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};

interface LogListViewProps {
  activeFields: CustomField[];
  selectedFieldsValue: CustomField[];
  onSelectedFieldsChange: (val: CustomField[]) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
  loading: boolean;
  filteredLogs: DailyLog[];
  handleOpen: (log: DailyLog) => void;
  handleDelete: (id: string) => void;
}

const LogListView: React.FC<LogListViewProps> = ({
  activeFields,
  selectedFieldsValue,
  onSelectedFieldsChange,
  sortOrder,
  onSortOrderChange,
  loading,
  filteredLogs,
  handleOpen,
  handleDelete
}) => {
  return (
    <>
      <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Autocomplete
          multiple
          size="small"
          options={activeFields}
          getOptionLabel={(f) => f.name}
          value={selectedFieldsValue}
          onChange={(_, val) => onSelectedFieldsChange(val)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filtrer par champs"
              placeholder="Sélectionner..."
              sx={{ bgcolor: "background.paper" }}
            />
          )}
          sx={{ minWidth: 280, flexGrow: 1, maxWidth: { md: 400 } }}
        />
        <FormControl size="small" sx={{ minWidth: 160, bgcolor: "background.paper" }}>
          <InputLabel>Ordre</InputLabel>
          <Select
            value={sortOrder}
            label="Ordre"
            onChange={(e) => onSortOrderChange(e.target.value as "asc" | "desc")}
          >
            <MenuItem value="desc">Plus récent</MenuItem>
            <MenuItem value="asc">Plus ancien</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      ) : (
        <LogTable
          logs={filteredLogs}
          activeFields={activeFields}
          onEdit={handleOpen}
          onDelete={handleDelete}
        />
      )}
    </>
  );
};

interface UseDailyLogsReturn {
  state: State;
  dispatch: React.Dispatch<Action>;
  managerTab: "calendar" | "list";
  setManagerTab: React.Dispatch<React.SetStateAction<"calendar" | "list">>;
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  activeFields: CustomField[];
  filteredLogs: DailyLog[];
  historicalValues: Record<string, string[]>;
  calendarDays: Array<{ dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }>;
  selectedFieldsValue: CustomField[];
  handleOpen: (log?: DailyLog) => void;
  handleClose: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleCalendarCellClick: (day: { dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }) => void;
}

const useDailyLogs = (): UseDailyLogsReturn => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    fields: [],
    loading: true,
    error: null,
    dialog: { open: false, isEditing: false, logId: null, submitting: false },
    formData: { date: new Date().toISOString().split("T")[0], notes: "", fieldValues: {} },
    filters: { selectedFields: [], sortOrder: "desc" }
  });

  const [managerTab, setManagerTab] = React.useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = React.useState<Date>(() => new Date());

  const { logs, fields, dialog, formData, filters } = state;

  const fetchData = useCallback(async (signal?: AbortSignal, isInitial = false) => {
    if (!isInitial) {
      dispatch({ type: "SET_LOADING", loading: true });
    }

    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal })
      ]);
      dispatch({ type: "SET_DATA", fields: fieldsData, logs: logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()) });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        dispatch({ type: "SET_ERROR", error: "Échec du chargement des données" });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      fetchData(controller.signal, true);
    });

    const refresh = () => { fetchData(); };
    window.addEventListener("vaultedmind:fields-updated", refresh);
    window.addEventListener("vaultedmind:logs-imported", refresh);

    return () => {
      controller.abort();
      window.removeEventListener("vaultedmind:fields-updated", refresh);
      window.removeEventListener("vaultedmind:logs-imported", refresh);
    };
  }, [fetchData]);

  const activeFields = useMemo(() => fields.filter(f => f.isActive), [fields]);

  const filteredLogs = useMemo(() => {
    const res = filters.selectedFields.length > 0
      ? logs.filter(l => filters.selectedFields.every(fid => l.fieldValues?.some(fv => fv.customFieldId === fid && fv.value)))
      : logs;

    return res.toSorted((a, b) => {
      const timeA = new Date(a.logDate).getTime();
      const timeB = new Date(b.logDate).getTime();
      return filters.sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [logs, filters]);

  const historicalValues = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    fields.forEach(f => {
      if (f.fieldType === FieldType.STRING && f.optionsOrder?.length) {
        map[f.id] = new Set(f.optionsOrder);
      }
    });
    logs.forEach(l => l.fieldValues?.forEach(fv => {
      if (fv.value?.trim()) {
        if (!map[fv.customFieldId]) map[fv.customFieldId] = new Set();
        const field = fields.find(x => x.id === fv.customFieldId);
        if (field && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          map[fv.customFieldId].add(formatHourlyValue(fv.value));
        } else {
          map[fv.customFieldId].add(fv.value);
        }
      }
    }));
    return Object.keys(map).reduce((acc, k) => {
      acc[k] = Array.from(map[k]).sort();
      return acc;
    }, {} as Record<string, string[]>);
  }, [logs, fields]);

  const handleOpen = (log?: DailyLog) => {
    if (log) {
      const fvMap: Record<string, string> = {};
      log.fieldValues?.forEach(fv => {
        const field = fields.find(f => f.id === fv.customFieldId);
        if (field && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          fvMap[fv.customFieldId] = formatHourlyValue(fv.value);
        } else {
          fvMap[fv.customFieldId] = fv.value;
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: true,
        logId: log.id,
        formData: { date: new Date(log.logDate).toISOString().split("T")[0], notes: log.notes || "", fieldValues: fvMap }
      });
    } else {
      const defaultFvMap: Record<string, string> = {};
      activeFields.forEach(field => {
        if (field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          defaultFvMap[field.id] = "08:00";
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: false,
        formData: { date: new Date().toISOString().split("T")[0], notes: "", fieldValues: defaultFvMap }
      });
    }
  };

  const handleClose = () => dispatch({ type: "CLOSE_DIALOG" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    try {
      let lid = dialog.logId;
      if (dialog.isEditing && lid) {
        await apiService.patch(`/health/daily-logs/${lid}`, { logDate: formData.date, notes: formData.notes });
      } else {
        const newLog = await apiService.post<DailyLog, { logDate: string, notes: string }>("/health/daily-logs", { logDate: formData.date, notes: formData.notes });
        lid = newLog.id;
      }

      const saveRequests = Object.entries(formData.fieldValues).reduce<Promise<unknown>[]>((acc, [fid, v]) => {
        if (v.trim()) {
          const field = fields.find(f => f.id === fid);
          let valueToSave = v;
          if (field && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
            valueToSave = parseHourlyValue(v);
          }
          acc.push(apiService.post(`/health/daily-logs/${lid}/values`, { customFieldId: fid, value: valueToSave }));
        }
        return acc;
      }, []);

      await Promise.all(saveRequests);

      startTransition(() => {
        fetchData();
      });
      handleClose();
    } catch (err: unknown) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Erreur lors de l'enregistrement" });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce journal ?")) return;
    try {
      await apiService.delete(`/health/daily-logs/${id}`);
      startTransition(() => {
        fetchData();
      });
    } catch (err: unknown) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Erreur lors de la suppression" });
    }
  };

  const selectedFieldsValue = useMemo(() =>
    activeFields.filter(f => filters.selectedFields.includes(f.id)),
    [activeFields, filters.selectedFields]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth(); // 0-indexed

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week for the first day (0 = Sun, 1 = Mon... 6 = Sat)
    // Adjust so Monday is 0, Sunday is 6
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const daysArray: { dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }[] = [];

    // Fill previous month padding
    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push({ dateStr: `pad-${year}-${month}-${i}`, dayNum: 0, isLogged: false });
    }

    // Match logs
    const logsByDate = new Map<string, DailyLog>();
    logs.forEach(log => {
      const dStr = new Date(log.logDate).toISOString().split("T")[0];
      logsByDate.set(dStr, log);
    });

    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const log = logsByDate.get(dStr);
      daysArray.push({
        dateStr: dStr,
        dayNum: day,
        isLogged: !!log,
        log
      });
    }

    return daysArray;
  }, [logs, calendarDate]);

  const handleCalendarCellClick = (day: { dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog }) => {
    if (!day.dateStr) return;
    if (day.isLogged && day.log) {
      handleOpen(day.log);
    } else {
      const defaultFvMap: Record<string, string> = {};
      activeFields.forEach(field => {
        if (field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          defaultFvMap[field.id] = "08:00";
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: false,
        formData: { date: day.dateStr, notes: "", fieldValues: defaultFvMap }
      });
    }
  };

  return {
    state,
    dispatch,
    managerTab,
    setManagerTab,
    calendarDate,
    setCalendarDate,
    activeFields,
    filteredLogs,
    historicalValues,
    calendarDays,
    selectedFieldsValue,
    handleOpen,
    handleClose,
    handleSubmit,
    handleDelete,
    handleCalendarCellClick
  };
};

export const DailyLogsManager: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) {
        setMounted(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const {
    state,
    dispatch,
    managerTab,
    setManagerTab,
    calendarDate,
    setCalendarDate,
    activeFields,
    filteredLogs,
    historicalValues,
    calendarDays,
    selectedFieldsValue,
    handleOpen,
    handleClose,
    handleSubmit,
    handleDelete,
    handleCalendarCellClick
  } = useDailyLogs();

  const { loading, error, dialog, formData } = state;

  if (!mounted) {
    return (
      <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, mt: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#142949" }}>Suivi Quotidien</Typography>
          <Tabs
            value={managerTab}
            onChange={(_, v) => setManagerTab(v)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, textTransform: "none" },
              '& .Mui-selected': { color: '#6366f1 !important', bgcolor: 'rgba(99, 102, 241, 0.08)' },
              '& .MuiTabs-indicator': { display: 'none' }
            }}
          >
            <Tab label="Calendrier" value="calendar" icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Liste" value="list" icon={<ListIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            borderRadius: 2,
            width: { xs: "100%", sm: "auto" }
          }}
        >
          Ajouter une entrée
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}

      {managerTab === "calendar" && (
        <LogCalendarView
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          calendarDays={calendarDays}
          handleCalendarCellClick={handleCalendarCellClick}
        />
      )}

      {managerTab === "list" && (
        <LogListView
          activeFields={activeFields}
          selectedFieldsValue={selectedFieldsValue}
          onSelectedFieldsChange={(val) => dispatch({ type: "UPDATE_FILTERS", data: { selectedFields: val.map(x => x.id) } })}
          sortOrder={state.filters.sortOrder}
          onSortOrderChange={(order) => dispatch({ type: "UPDATE_FILTERS", data: { sortOrder: order } })}
          loading={loading}
          filteredLogs={filteredLogs}
          handleOpen={handleOpen}
          handleDelete={handleDelete}
        />
      )}

      <LogEntryDialog
        open={dialog.open}
        onClose={handleClose}
        isEditing={dialog.isEditing}
        logDate={formData.date}
        setLogDate={(v) => dispatch({ type: "UPDATE_FORM", data: { date: v } })}
        notes={formData.notes}
        setNotes={(v) => dispatch({ type: "UPDATE_FORM", data: { notes: v } })}
        fieldValuesMap={formData.fieldValues}
        onFieldValueChange={(fid, v) => dispatch({ type: "UPDATE_FORM", data: { fieldValues: { ...formData.fieldValues, [fid]: v } } })}
        onSubmit={handleSubmit}
        submitting={dialog.submitting}
        activeFields={activeFields}
        historicalValues={historicalValues}
      />
    </Paper>
  );
};
