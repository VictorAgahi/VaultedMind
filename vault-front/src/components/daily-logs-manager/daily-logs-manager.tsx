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
  Autocomplete
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { apiService } from "@/services/api.service";
import {
  AppError,
  CustomField,
  DailyLog,
} from "@/types";
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

export const DailyLogsManager: React.FC = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    fields: [],
    loading: true,
    error: null,
    dialog: { open: false, isEditing: false, logId: null, submitting: false },
    formData: { date: new Date().toISOString().split("T")[0], notes: "", fieldValues: {} },
    filters: { selectedFields: [], sortOrder: "desc" }
  });

  const { logs, fields, loading, error, dialog, formData, filters } = state;

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
      if (f.optionsOrder?.length) {
        map[f.id] = new Set(f.optionsOrder);
      }
    });
    logs.forEach(l => l.fieldValues?.forEach(fv => {
      if (fv.value?.trim()) {
        if (!map[fv.customFieldId]) map[fv.customFieldId] = new Set();
        map[fv.customFieldId].add(fv.value);
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
      log.fieldValues?.forEach(fv => { fvMap[fv.customFieldId] = fv.value; });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: true,
        logId: log.id,
        formData: { date: new Date(log.logDate).toISOString().split("T")[0], notes: log.notes || "", fieldValues: fvMap }
      });
    } else {
      dispatch({ type: "OPEN_DIALOG", isEditing: false });
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
          acc.push(apiService.post(`/health/daily-logs/${lid}/values`, { customFieldId: fid, value: v }));
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

  return (
    <Paper sx={{ p: 4, borderRadius: 4, mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#142949" }}>Suivi Quotidien</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: 2 }}>
          Ajouter une entrée
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}

      <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Autocomplete
          multiple
          size="small"
          options={activeFields}
          getOptionLabel={(f) => f.name}
          value={selectedFieldsValue}
          onChange={(_, val) => dispatch({ type: "UPDATE_FILTERS", data: { selectedFields: val.map(x => x.id) } })}
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
            value={filters.sortOrder}
            label="Ordre"
            onChange={(e) => dispatch({ type: "UPDATE_FILTERS", data: { sortOrder: e.target.value as "asc" | "desc" } })}
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
