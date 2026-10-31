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
  Tabs,
  Tab,
  IconButton,
  ButtonBase,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { WellbeingCards } from "@/components/dashboard/wellbeing-cards";
import { NEW_ENTRY_EVENT } from "@/components/bottom-nav/bottom-nav";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ListIcon from "@mui/icons-material/List";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { apiService } from "@/services/api.service";
import {
  AppError,
  CustomField,
  DailyLog,
  FieldType,
  HealthProposals,
} from "@/types";
import { parseHourlyValue, formatHourlyValue } from "@/utils/time-converter";
import { LogEntryDialog, AgentSource } from "./log-entry-dialog";
import type { AutofillFieldInfo } from "./use-voice-entry";
import type { AutofillProposal } from "./use-voice-entry";
import { LogTable } from "./log-table";
import { localDateStr } from "@/utils/local-date";
import { formatHealthValue, HEALTH_METRICS } from "@/utils/health-metrics";
import { HealthProposalsDialog } from "@/components/health-proposals/health-proposals-panel";
import {
  clearHealthSyncPending,
  HealthSyncDraft,
  HealthSyncMarker,
  readHealthSyncDraft,
  readHealthSyncMarker,
  saveHealthSyncPending,
} from "@/utils/health-sync-pending";
import { DailyEntryPayload, flushOutbox, isNetworkFailure, OUTBOX_FLUSHED_EVENT, queueEntry, readOfflineSnapshot, saveOfflineSnapshot } from "@/utils/entry-outbox";

interface State {
  logs: DailyLog[];
  fields: CustomField[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  dialogError: string | null;
  /** Champs que le récit du jour peut remplir automatiquement ; null tant que la liste n'est pas chargée. */
  autofillFields: AutofillFieldInfo[] | null;
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
    subFieldValues: Record<string, Record<string, string>>;
    /** Valeurs proposées par l'assistant et pas encore modifiées à la main. */
    agentSources: Record<string, AgentSource>;
    /** Champs dont la valeur est un préremplissage automatique (dernière valeur, heure par défaut), pas une saisie. */
    defaultedFieldIds: string[];
  };
  filters: {
    selectedFields: string[];
    sortOrder: "asc" | "desc";
  };
}

type Action =
  | { type: "SET_DATA"; fields: CustomField[]; logs: DailyLog[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_AUTOFILL_FIELDS"; fields: AutofillFieldInfo[] }
  | { type: "UPSERT_LOG"; log: DailyLog }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_NOTICE"; notice: string | null }
  | { type: "SET_DIALOG_ERROR"; error: string | null }
  | { type: "OPEN_DIALOG"; isEditing: boolean; logId?: string | null; formData?: State["formData"] }
  | { type: "CLOSE_DIALOG" }
  | { type: "HEALTH_SYNC_RESULT"; fields: CustomField[]; logs: DailyLog[]; date: string; logId: string | null; healthValues: Record<string, string>; draft: HealthSyncDraft | null }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "UPDATE_FORM"; data: Partial<State["formData"]> }
  | { type: "SET_FIELD_VALUE"; fieldId: string; value: string }
  | { type: "CLEAR_AGENT_VALUE"; fieldId: string }
  | { type: "APPLY_PROPOSALS"; values: Record<string, AgentSource> }
  | { type: "UPDATE_FILTERS"; data: Partial<State["filters"]> };

const withoutKey = <T,>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_DATA": return { ...state, fields: action.fields, logs: action.logs, loading: false, error: null };
    case "SET_LOADING": return { ...state, loading: action.loading };
    case "SET_AUTOFILL_FIELDS": return { ...state, autofillFields: action.fields };
    case "UPSERT_LOG": {
      const exists = state.logs.some(l => l.id === action.log.id);
      return { ...state, logs: exists ? state.logs.map(l => l.id === action.log.id ? action.log : l) : [...state.logs, action.log] };
    }
    case "SET_ERROR": return { ...state, error: action.error, loading: false };
    case "SET_NOTICE": return { ...state, notice: action.notice };
    case "SET_DIALOG_ERROR": return { ...state, dialogError: action.error };
    case "OPEN_DIALOG": return {
      ...state,
      dialogError: null,
      dialog: { ...state.dialog, open: true, isEditing: action.isEditing, logId: action.logId || null },
      formData: action.formData || { date: localDateStr(), notes: "", fieldValues: {}, subFieldValues: {}, agentSources: {}, defaultedFieldIds: [] }
    };
    case "CLOSE_DIALOG": return { ...state, dialog: { ...state.dialog, open: false } };
    case "HEALTH_SYNC_RESULT": {
      const base = { ...state, fields: action.fields, logs: action.logs, loading: false, error: null };
      // Une saisie reprise (brouillon) rouvre la fenêtre ; une fenêtre restée ouverte est simplement complétée.
      const source = state.dialog.open ? state.formData : action.draft;
      if (!source || source.date !== action.date) return base;
      const healthIds = Object.keys(action.healthValues);
      return {
        ...base,
        dialog: { ...state.dialog, open: true, isEditing: action.logId !== null || (!state.dialog.open && !!action.draft?.isEditing), logId: action.logId ?? (state.dialog.open ? state.dialog.logId : action.draft?.logId ?? null) },
        formData: {
          date: source.date,
          notes: source.notes,
          // Seuls les champs Santé reçoivent les valeurs synchronisées : le reste de la saisie n'est pas touché.
          fieldValues: { ...source.fieldValues, ...action.healthValues },
          subFieldValues: source.subFieldValues,
          agentSources: Object.fromEntries(Object.entries(source.agentSources).filter(([id]) => !healthIds.includes(id))),
          defaultedFieldIds: source.defaultedFieldIds.filter(id => !healthIds.includes(id)),
        },
      };
    }
    case "SET_SUBMITTING": return { ...state, dialog: { ...state.dialog, submitting: action.submitting } };
    case "UPDATE_FORM": return { ...state, formData: { ...state.formData, ...action.data } };
    case "SET_FIELD_VALUE": {
      if ((state.formData.fieldValues[action.fieldId] ?? "") === action.value) return state;
      // Une modification à la main fait de la valeur une saisie : elle n'est plus marquée comme proposée.
      return {
        ...state,
        formData: {
          ...state.formData,
          fieldValues: { ...state.formData.fieldValues, [action.fieldId]: action.value },
          agentSources: withoutKey(state.formData.agentSources, action.fieldId),
          defaultedFieldIds: state.formData.defaultedFieldIds.filter(id => id !== action.fieldId),
        },
      };
    }
    case "CLEAR_AGENT_VALUE": return {
      ...state,
      formData: {
        ...state.formData,
        fieldValues: { ...state.formData.fieldValues, [action.fieldId]: "" },
        agentSources: withoutKey(state.formData.agentSources, action.fieldId),
      },
    };
    case "APPLY_PROPOSALS": return {
      ...state,
      formData: {
        ...state.formData,
        fieldValues: {
          ...state.formData.fieldValues,
          ...Object.fromEntries(Object.entries(action.values).map(([fieldId, source]) => [fieldId, source.value])),
        },
        agentSources: { ...state.formData.agentSources, ...action.values },
        defaultedFieldIds: state.formData.defaultedFieldIds.filter(id => !(id in action.values)),
      },
    };
    case "UPDATE_FILTERS": return { ...state, filters: { ...state.filters, ...action.data } };
    default: return state;
  }
};



export type CalendarDayItem = { dateStr: string; dayNum: number; isLogged: boolean; log?: DailyLog; filledRatio?: number };

interface LogCalendarViewProps {
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  calendarDays: CalendarDayItem[];
  handleCalendarCellClick: (day: CalendarDayItem) => void;
}

const CALENDAR_WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const LogCalendarView: React.FC<LogCalendarViewProps> = ({
  calendarDate,
  setCalendarDate,
  calendarDays,
  handleCalendarCellClick
}) => {
  const todayStr = localDateStr();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getAriaLabel = (day: typeof calendarDays[number]) => {
    const formattedDate = new Date(day.dateStr).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (!day.isLogged) return `Ajouter un journal pour le ${formattedDate}`;
    const ratio = day.filledRatio ?? 0;
    const level = ratio >= 0.7 ? "complet" : ratio >= 0.35 ? "bien rempli" : "partiel";
    return `Modifier le journal du ${formattedDate}, ${level}`;
  };

  // Plus le jour est complet, plus la teinte est profonde (rampe séquentielle corail).
  const getDayColors = (day: typeof calendarDays[number]) => {
    if (!day.isLogged) return { bgcolor: "action.hover", color: "text.secondary" };
    const ratio = day.filledRatio ?? 0;
    if (ratio >= 0.7) return { bgcolor: "primary.main", color: "primary.contrastText" };
    if (ratio >= 0.35) return { bgcolor: "color-mix(in oklab, var(--chart-s1) 60%, var(--chart-surface))", color: "var(--chart-on-mid)" };
    return { bgcolor: "color-mix(in oklab, var(--chart-s1) 28%, var(--chart-surface))", color: "text.primary" };
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <IconButton onClick={handlePrevMonth} aria-label="Mois précédent">
          <ChevronLeftIcon />
        </IconButton>
        <Typography suppressHydrationWarning variant="subtitle1" sx={{ textTransform: "capitalize" }}>
          {calendarDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </Typography>
        <IconButton onClick={handleNextMonth} aria-label="Mois suivant">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <Box aria-hidden sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.5, sm: 1 }, textAlign: "center", mb: 0.75 }}>
        {CALENDAR_WEEKDAYS.map((dayName, i) => (
          <Typography key={i} variant="caption" sx={{ fontWeight: 700, color: "text.disabled" }}>
            {dayName}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.5, sm: 1 } }}>
        {calendarDays.map((day) => {
          if (day.dayNum === 0) {
            return <Box key={day.dateStr} sx={{ aspectRatio: { xs: "1", md: "1.4" } }} />;
          }
          const isToday = day.dateStr === todayStr;
          return (
            <ButtonBase
              key={day.dateStr}
              onClick={() => handleCalendarCellClick(day)}
              aria-label={getAriaLabel(day)}
              sx={{
                aspectRatio: { xs: "1", md: "1.4" },
                borderRadius: 2,
                ...getDayColors(day),
                // Anneau "aujourd'hui" en ombre portée : l'outline reste libre pour le focus clavier.
                boxShadow: isToday ? "0 0 0 2px var(--mui-palette-background-paper), 0 0 0 4px var(--accent-strong)" : "none",
                transition: "transform 160ms cubic-bezier(.2,0,0,1)",
                "&:active": { transform: "scale(0.94)" },
              }}
            >
              <Typography component="span" sx={{ fontWeight: isToday ? 700 : 500, fontSize: { xs: 13, md: 15 }, fontVariantNumeric: "tabular-nums" }}>
                {day.dayNum}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2, color: "text.secondary" }}>
        {[
          { label: "Partiel", bg: "color-mix(in oklab, var(--chart-s1) 28%, var(--chart-surface))" },
          { label: "Bien rempli", bg: "color-mix(in oklab, var(--chart-s1) 60%, var(--chart-surface))" },
          { label: "Complet", bg: "var(--mui-palette-primary-main)" },
        ].map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: item.bg }} />
            <Typography variant="caption">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const MOOD_LEVELS = ["Difficile", "Bof", "Moyen", "Bien", "Très bien"] as const;

// Ramène l'un des 5 niveaux d'humeur sur l'échelle du champ (1-5, 1-10…).
const moodLevelToValue = (field: CustomField, level: number): string => {
  const min = field.min ?? 1;
  const max = field.max ?? 5;
  return String(Math.round(min + (level * (max - min)) / (MOOD_LEVELS.length - 1)));
};

const valueToMoodLevel = (field: CustomField, value: string | undefined): number | null => {
  if (value === undefined || value === "") return null;
  const min = field.min ?? 1;
  const max = field.max ?? 5;
  const ratio = (parseFloat(value) - min) / (max - min || 1);
  return Math.max(0, Math.min(MOOD_LEVELS.length - 1, Math.round(ratio * (MOOD_LEVELS.length - 1))));
};

interface TodayCardProps {
  todayLogged: boolean;
  streak: number;
  last7: boolean[];
  onOpenToday: () => void;
  quickField?: CustomField;
  quickLevel: number | null;
  onQuickCheckin: (level: number) => void;
  quickSaving: boolean;
}

const TodayCard: React.FC<TodayCardProps> = ({ todayLogged, streak, last7, onOpenToday, quickField, quickLevel, onQuickCheckin, quickSaving }) => (
  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" } }}>
    <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", gap: 1.5 }}>
      <Typography suppressHydrationWarning variant="overline" sx={{ opacity: 0.85, display: "block", "&::first-letter": { textTransform: "uppercase" } }}>
        {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </Typography>
      <Typography variant="h3" component="p" sx={{ color: "inherit" }}>
        {quickField
          ? quickLevel !== null ? "Merci, votre humeur est notée." : "Comment vous sentez-vous aujourd'hui ?"
          : todayLogged ? "Votre journée est notée." : "Votre journée n'est pas encore notée."}
      </Typography>
      {quickField && (
        // Check-in express : un toucher enregistre l'humeur du jour.
        <Box role="radiogroup" aria-label={`${quickField.name} du jour`} sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.75 }}>
          {MOOD_LEVELS.map((label, level) => {
            const selected = quickLevel === level;
            return (
              <ButtonBase
                key={label}
                role="radio"
                aria-checked={selected}
                disabled={quickSaving}
                onClick={() => onQuickCheckin(level)}
                sx={{
                  minHeight: 56,
                  borderRadius: 3,
                  px: 0.5,
                  flexDirection: "column",
                  gap: 0.5,
                  bgcolor: selected ? "background.paper" : "rgba(var(--mui-palette-primary-contrastTextChannel) / 0.12)",
                  color: selected ? "primary.main" : "inherit",
                  transition: "background-color 160ms cubic-bezier(.2,0,0,1)",
                }}
              >
                <Box aria-hidden sx={{ display: "flex", gap: "3px", alignItems: "flex-end", height: 14 }}>
                  {MOOD_LEVELS.map((_, bar) => (
                    <Box key={bar} sx={{ width: 3, height: 4 + bar * 2.5, borderRadius: 1, bgcolor: "currentColor", opacity: bar <= level ? 1 : 0.3 }} />
                  ))}
                </Box>
                <Typography component="span" sx={{ fontSize: "0.6875rem", fontWeight: 700, lineHeight: 1.1, textAlign: "center" }}>{label}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
      <Button
        onClick={onOpenToday}
        variant={quickField ? "text" : "contained"}
        sx={quickField
          ? { justifySelf: "start", color: "inherit", px: 0, textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44 }
          : { justifySelf: "start", bgcolor: "background.paper", color: "primary.main", "&:hover": { bgcolor: "background.default" } }}
      >
        {quickField ? (todayLogged ? "Compléter ma journée" : "Noter toute ma journée") : todayLogged ? "Modifier ma journée" : "Noter ma journée"}
      </Button>
    </Paper>
    <Paper sx={{ p: 2.5, borderRadius: 4, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="subtitle2">Série en cours</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {streak} jour{streak > 1 ? "s" : ""}
        </Typography>
      </Box>
      <Box role="img" sx={{ display: "flex", gap: 0.75, alignItems: "center" }} aria-label={`${last7.filter(Boolean).length} jours notés sur les 7 derniers`}>
        {last7.map((on, i) => (
          // Noté : segment plein et épais ; non noté : segment fin. La forme double la couleur.
          <Box key={i} sx={{ flex: 1, height: on ? 8 : 4, borderRadius: 1, bgcolor: on ? "var(--accent-strong)" : "var(--mui-palette-divider)" }} />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">7 derniers jours</Typography>
    </Paper>
  </Box>
);

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
  // Recherche dans les notes : retrouver le jour où l'on a parlé d'un sujet.
  const [noteQuery, setNoteQuery] = React.useState("");
  const normalizedQuery = noteQuery.trim().toLowerCase();
  const visibleLogs = normalizedQuery
    ? filteredLogs.filter(log => (log.notes ?? "").toLowerCase().includes(normalizedQuery))
    : filteredLogs;
  return (
    <>
      <TextField
        type="search"
        label="Rechercher dans mes notes"
        value={noteQuery}
        onChange={(e) => setNoteQuery(e.target.value)}
        margin="none"
        sx={{ mb: 1.5 }}
        helperText={normalizedQuery ? `${visibleLogs.length} journée${visibleLogs.length > 1 ? "s" : ""} trouvée${visibleLogs.length > 1 ? "s" : ""}` : undefined}
      />
      <Box sx={{ mb: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
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
              margin="none"
            />
          )}
          sx={{ minWidth: { xs: "100%", sm: 280 }, flexGrow: 1, maxWidth: { md: 400 } }}
        />
        <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
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
          logs={visibleLogs}
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
  calendarDays: CalendarDayItem[];
  selectedFieldsValue: CustomField[];
  handleOpen: (log?: DailyLog) => void;
  handleClose: () => void;
  handleFieldValueChange: (fieldId: string, value: string) => void;
  handleClearAgentValue: (fieldId: string) => void;
  handleApplyProposals: (proposals: AutofillProposal[]) => number;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleCalendarCellClick: (day: CalendarDayItem) => void;
  todayLogged: boolean;
  streak: number;
  last7: boolean[];
  openToday: () => void;
}

const useDailyLogs = (): UseDailyLogsReturn => {
  const [state, dispatch] = React.useReducer(reducer, {
    logs: [],
    fields: [],
    loading: true,
    error: null,
    notice: null,
    dialogError: null,
    autofillFields: null,
    dialog: { open: false, isEditing: false, logId: null, submitting: false },
    formData: { date: localDateStr(), notes: "", fieldValues: {}, subFieldValues: {}, agentSources: {}, defaultedFieldIds: [] },
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
      const sortedLogs = logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
      dispatch({ type: "SET_DATA", fields: fieldsData, logs: sortedLogs });
      saveOfflineSnapshot(fieldsData, sortedLogs);
      // Information d'aide seulement : si elle manque, la saisie fonctionne sans.
      apiService
        .get<{ fields: AutofillFieldInfo[] }>("/health/daily-logs/autofill-fields", { signal })
        .then(({ fields: eligible }) => dispatch({ type: "SET_AUTOFILL_FIELDS", fields: eligible }))
        .catch(() => undefined);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return;
      // Hors ligne : on affiche la dernière copie connue pour pouvoir noter sa journée quand même.
      const snapshot = isNetworkFailure(err) ? readOfflineSnapshot() : null;
      if (snapshot) {
        dispatch({ type: "SET_DATA", fields: snapshot.fields, logs: snapshot.logs });
        dispatch({ type: "SET_NOTICE", notice: "Hors ligne : vous voyez la dernière version enregistrée sur cet appareil." });
      } else {
        dispatch({ type: "SET_ERROR", error: "Les données n'ont pas pu être chargées. Vérifiez votre connexion." });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      fetchData(controller.signal, true);
    });

    const refresh = () => { fetchData(); };
    const flush = () => { flushOutbox(); };
    window.addEventListener("vaultedmind:fields-updated", refresh);
    window.addEventListener("vaultedmind:logs-imported", refresh);
    window.addEventListener(OUTBOX_FLUSHED_EVENT, refresh);
    window.addEventListener("online", flush);
    flushOutbox();

    return () => {
      controller.abort();
      window.removeEventListener("vaultedmind:fields-updated", refresh);
      window.removeEventListener("vaultedmind:logs-imported", refresh);
      window.removeEventListener(OUTBOX_FLUSHED_EVENT, refresh);
      window.removeEventListener("online", flush);
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
      const subFvMap: Record<string, Record<string, string>> = {};
      const agentSources: Record<string, AgentSource> = {};
      log.fieldValues?.forEach(fv => {
        const field = fields.find(f => f.id === fv.customFieldId);
        if (field && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          fvMap[fv.customFieldId] = formatHourlyValue(fv.value);
        } else {
          fvMap[fv.customFieldId] = fv.value;
        }
        if (fv.subValues) {
          subFvMap[fv.customFieldId] = fv.subValues;
        }
        if (fv.source === "agent") {
          agentSources[fv.customFieldId] = { value: fvMap[fv.customFieldId] };
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: true,
        logId: log.id,
        formData: { date: new Date(log.logDate).toISOString().split("T")[0], notes: log.notes || "", fieldValues: fvMap, subFieldValues: subFvMap, agentSources, defaultedFieldIds: [] }
      });
    } else {
      const defaultFvMap: Record<string, string> = {};
      const mostRecentLog = [...logs].sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())[0];

      activeFields.forEach(field => {
        if (field.rememberLastValue && mostRecentLog) {
          const lastFv = mostRecentLog.fieldValues?.find(fv => fv.customFieldId === field.id);
          if (lastFv) {
            defaultFvMap[field.id] = lastFv.value;
          }
        }
        
        if (!defaultFvMap[field.id] && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          defaultFvMap[field.id] = "08:00";
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: false,
        formData: { date: localDateStr(), notes: "", fieldValues: defaultFvMap, subFieldValues: {}, agentSources: {}, defaultedFieldIds: Object.keys(defaultFvMap) }
      });
    }
  };

  const handleClose = () => dispatch({ type: "CLOSE_DIALOG" });

  const handleFieldValueChange = (fieldId: string, value: string) => dispatch({ type: "SET_FIELD_VALUE", fieldId, value });
  const handleClearAgentValue = (fieldId: string) => dispatch({ type: "CLEAR_AGENT_VALUE", fieldId });

  // Les propositions ne remplissent que ce qui est vide (ou un préremplissage automatique, ou une proposition non modifiée) :
  // une valeur déjà saisie n'est jamais écrasée. Renvoie le nombre de champs préremplis.
  const formDataRef = React.useRef(formData);
  const fieldsRef = React.useRef(fields);
  useEffect(() => {
    formDataRef.current = formData;
    fieldsRef.current = fields;
  });
  const handleApplyProposals = (proposals: AutofillProposal[]): number => {
    const current = formDataRef.current;
    const accepted: Record<string, AgentSource> = {};
    proposals.forEach(proposal => {
      const field = fieldsRef.current.find(f => f.id === proposal.fieldId && f.isActive);
      if (!field) return;
      const existing = current.fieldValues[field.id]?.trim() ?? "";
      const replaceable = existing === "" || current.defaultedFieldIds.includes(field.id) || !!current.agentSources[field.id];
      if (!replaceable) return;
      const isHourly = field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly");
      accepted[field.id] = {
        value: isHourly ? formatHourlyValue(proposal.value) : proposal.value,
        quote: proposal.quote,
      };
    });
    if (Object.keys(accepted).length > 0) dispatch({ type: "APPLY_PROPOSALS", values: accepted });
    return Object.keys(accepted).length;
  };

  // Construit la journée complète : valeurs renseignées, et valeurs effacées à supprimer côté serveur.
  const buildEntryPayload = (): DailyEntryPayload => {
    const values: DailyEntryPayload["values"] = [];
    Object.entries(formData.fieldValues).forEach(([fid, v]) => {
      if (!v.trim()) return;
      const field = fields.find(f => f.id === fid);
      const value = field && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")
        ? parseHourlyValue(v)
        : v;
      const subValues = Object.entries(formData.subFieldValues?.[fid] ?? {}).reduce<Record<string, string>>((acc, [sId, sVal]) => {
        if (sVal && sVal.trim()) acc[sId] = sVal.trim();
        return acc;
      }, {});
      values.push({
        customFieldId: fid,
        value,
        subValues: Object.keys(subValues).length ? subValues : undefined,
        ...(formData.agentSources[fid] && { source: "agent" as const }),
      });
    });
    const existingLog = dialog.isEditing ? logs.find(l => l.id === dialog.logId) : undefined;
    const clearedFieldIds = (existingLog?.fieldValues ?? [])
      .map(fv => fv.customFieldId)
      .filter(fid => !formData.fieldValues[fid]?.trim());
    return {
      logId: dialog.isEditing && dialog.logId ? dialog.logId : undefined,
      logDate: formData.date,
      notes: formData.notes,
      values,
      clearedFieldIds,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    dispatch({ type: "SET_DIALOG_ERROR", error: null });
    const payload = buildEntryPayload();
    try {
      // Un seul appel transactionnel : la journée est enregistrée entièrement ou pas du tout.
      await apiService.post<DailyLog, DailyEntryPayload>("/health/daily-logs/entry", payload);
      startTransition(() => {
        fetchData();
      });
      handleClose();
    } catch (err: unknown) {
      if (isNetworkFailure(err)) {
        queueEntry(payload);
        dispatch({ type: "SET_NOTICE", notice: "Vous êtes hors ligne : la journée est gardée sur cet appareil et sera envoyée dès le retour du réseau." });
        handleClose();
      } else {
        const error = err as AppError;
        dispatch({ type: "SET_DIALOG_ERROR", error: error.message || "L'enregistrement a échoué. Réessayez." });
      }
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

    const daysArray: CalendarDayItem[] = [];

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
      let filledRatio = 0;
      if (log && log.fieldValues && activeFields.length > 0) {
        filledRatio = log.fieldValues.length / activeFields.length;
      }
      daysArray.push({
        dateStr: dStr,
        dayNum: day,
        isLogged: !!log,
        log,
        filledRatio
      });
    }

    return daysArray;
  }, [logs, calendarDate, activeFields]);

  const handleCalendarCellClick = (day: CalendarDayItem) => {
    if (!day.dateStr) return;
    if (day.isLogged && day.log) {
      handleOpen(day.log);
    } else {
      const defaultFvMap: Record<string, string> = {};
      const mostRecentLog = [...logs].sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())[0];

      activeFields.forEach(field => {
        if (field.rememberLastValue && mostRecentLog) {
          const lastFv = mostRecentLog.fieldValues?.find(fv => fv.customFieldId === field.id);
          if (lastFv) {
            defaultFvMap[field.id] = lastFv.value;
          }
        }

        if (!defaultFvMap[field.id] && field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
          defaultFvMap[field.id] = "08:00";
        }
      });
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: false,
        formData: { date: day.dateStr, notes: "", fieldValues: defaultFvMap, subFieldValues: {}, agentSources: {}, defaultedFieldIds: Object.keys(defaultFvMap) }
      });
    }
  };

  const loggedDates = useMemo(() => new Set(logs.map(l => new Date(l.logDate).toISOString().split("T")[0])), [logs]);

  const { todayLogged, streak, last7 } = useMemo(() => {
    const dayStr = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return localDateStr(d);
    };
    const isTodayLogged = loggedDates.has(dayStr(0));
    // La série continue tant que la journée d'aujourd'hui peut encore être notée.
    let count = 0;
    for (let i = isTodayLogged ? 0 : 1; loggedDates.has(dayStr(i)); i++) count++;
    return {
      todayLogged: isTodayLogged,
      streak: count,
      last7: Array.from({ length: 7 }, (_, i) => loggedDates.has(dayStr(6 - i))),
    };
  }, [loggedDates]);

  const openToday = () => {
    const todayStr = localDateStr();
    const todayLog = logs.find(l => new Date(l.logDate).toISOString().split("T")[0] === todayStr);
    handleOpen(todayLog);
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
    handleFieldValueChange,
    handleClearAgentValue,
    handleApplyProposals,
    handleSubmit,
    handleDelete,
    handleCalendarCellClick,
    todayLogged,
    streak,
    last7,
    openToday,
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
    handleFieldValueChange,
    handleClearAgentValue,
    handleApplyProposals,
    handleSubmit,
    handleDelete,
    handleCalendarCellClick,
    todayLogged,
    streak,
    last7,
    openToday,
  } = useDailyLogs();
  const router = useRouter();
  const { user } = useAuth();
  const [quickSaving, setQuickSaving] = React.useState(false);
  // Retour du raccourci Apple Santé (bouton de retour d'iOS, ou ?healthSync=1 des anciens raccourcis) : les valeurs sont déjà enregistrées, on recharge et on confirme.
  const [healthSyncDone, setHealthSyncDone] = React.useState(false);
  const healthSyncHandledRef = React.useRef(false);
  const [healthSyncMessage, setHealthSyncMessage] = React.useState("Données Santé récupérées");
  const [healthPendingCount, setHealthPendingCount] = React.useState(0);
  const [proposalsOpen, setProposalsOpen] = React.useState(false);
  const [startStep, setStartStep] = React.useState(0);
  const stepRef = React.useRef(0);
  const stateRef = React.useRef(state);
  const healthSyncRunningRef = React.useRef(false);
  const aliveRef = React.useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  useEffect(() => {
    stateRef.current = state;
  });
  const lastHealthReturnRef = React.useRef(0);
  useEffect(() => {
    // La reprise d'une étape ne vaut que pour une ouverture : fermée, la fenêtre repart de la première étape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!state.dialog.open && startStep !== 0) setStartStep(0);
  }, [state.dialog.open, startStep]);
  const handleStepChange = useCallback((step: number) => { stepRef.current = step; }, []);
  // Le rappel du soir ouvre la saisie du jour prête à enregistrer (?new=1&voice=1) ; le toucher reste nécessaire sur iOS.
  const [voiceReady, setVoiceReady] = React.useState(false);
  const closeDialog = () => {
    setVoiceReady(false);
    handleClose();
  };

  // Valeurs des champs Apple Santé d'une journée (champs liés à une métrique ou de la catégorie « Apple Santé »).
  const healthValuesOf = (fields: CustomField[], logs: DailyLog[], date: string): { logId: string | null; values: Record<string, string> } => {
    const log = logs.find(l => new Date(l.logDate).toISOString().split("T")[0] === date);
    const values: Record<string, string> = {};
    log?.fieldValues?.forEach(fv => {
      const field = fields.find(f => f.id === fv.customFieldId);
      if (!field || !(field.appleWatchMetric || field.category?.trim() === "Apple Santé")) return;
      const isHourly = field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly");
      values[field.id] = isHourly ? formatHourlyValue(fv.value) : fv.value;
    });
    return { logId: log?.id ?? null, values };
  };

  // Phrase de confirmation : les valeurs arrivées dans les champs liés à Apple Santé, ou un constat calme.
  const describeHealthSync = (fields: CustomField[], values: Record<string, string>, changed: boolean): string => {
    if (!changed) return "Aucune nouvelle donnée Santé reçue pour l'instant.";
    const arrived = HEALTH_METRICS.flatMap(info => {
      const field = fields.find(f => f.appleWatchMetric === info.metric);
      const raw = field ? values[field.id] : undefined;
      return field && raw !== undefined ? [`${field.name} ${formatHealthValue(info.metric, raw, field.appleWatchUnit)}`] : [];
    });
    if (arrived.length > 0) return `Données Santé récupérées : ${arrived.join(", ")}`;
    return Object.keys(values).length > 0 ? "Données Santé récupérées" : "Aucune nouvelle donnée Santé reçue pour l'instant.";
  };

  // Avant de quitter pour le raccourci : on garde la saisie en cours et on note qu'une synchronisation est attendue.
  const handleBeforeHealthSync = () => {
    const { dialog: dlg, formData: fd, fields: allFields, logs: allLogs } = stateRef.current;
    const marker: HealthSyncMarker = {
      date: fd.date,
      startedAt: Date.now(),
      baseline: healthValuesOf(allFields, allLogs, fd.date).values,
    };
    const draft: HealthSyncDraft | null = dlg.open
      ? { ...fd, step: stepRef.current, isEditing: dlg.isEditing, logId: dlg.logId, savedAt: Date.now() }
      : null;
    saveHealthSyncPending(marker, draft);
  };

  // Retour du raccourci : recharge champs et journaux, attend les valeurs si besoin, puis met l'écran à jour.
  const handleHealthReturn = useCallback(async () => {
    // Un même retour peut être annoncé par plusieurs événements (URL, visibilité, focus) : un seul est traité.
    if (healthSyncRunningRef.current || Date.now() - lastHealthReturnRef.current < 5000) return;
    const marker = readHealthSyncMarker();
    healthSyncRunningRef.current = true;
    // Le marqueur est consommé tout de suite : un même retour n'est jamais traité deux fois.
    clearHealthSyncPending();
    const date = marker?.date ?? localDateStr();
    const draft = marker ? readHealthSyncDraft(marker.date) : null;
    const signature = (values: Record<string, string>) => JSON.stringify(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
    try {
      let result: { fields: CustomField[]; logs: DailyLog[]; values: Record<string, string>; logId: string | null } | null = null;
      for (let attempt = 0; attempt < 9; attempt++) {
        if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 1500));
        if (!aliveRef.current) return;
        const [fields, rawLogs] = await Promise.all([
          apiService.get<CustomField[]>("/health/custom-fields"),
          apiService.get<DailyLog[]>("/health/daily-logs"),
        ]);
        const logs = rawLogs.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());
        const { logId, values } = healthValuesOf(fields, logs, date);
        result = { fields, logs, values, logId };
        // Sans marqueur (rechargement par l'URL seule), on ne sait pas ce qui a changé : on prend l'état actuel.
        if (!marker || signature(values) !== signature(marker.baseline)) break;
      }
      if (!result || !aliveRef.current) return;
      saveOfflineSnapshot(result.fields, result.logs);
      if (draft && !stateRef.current.dialog.open) setStartStep(draft.step);
      dispatch({ type: "HEALTH_SYNC_RESULT", fields: result.fields, logs: result.logs, date, logId: result.logId, healthValues: result.values, draft });
      const changed = !marker || signature(result.values) !== signature(marker.baseline);
      // Liens faits par l'assistant pendant cette synchronisation, et propositions en attente ; facultatif.
      const proposals = await apiService.get<HealthProposals>("/integrations/health/proposals").catch(() => null);
      if (!aliveRef.current) return;
      const since = (marker?.startedAt ?? Date.now()) - 60_000;
      const autoLinked = marker
        ? (proposals?.autoLinked ?? []).filter(link => new Date(link.decidedAt).getTime() >= since)
        : [];
      const linkedText = autoLinked.length > 0
        ? ` Relié automatiquement : ${autoLinked.map(link => `${link.label} → ${link.fieldName}`).join(", ")}.`
        : "";
      const pendingCount = proposals?.proposals.length ?? 0;
      const pendingText = pendingCount > 0
        ? ` ${pendingCount} nouvelle${pendingCount > 1 ? "s" : ""} donnée${pendingCount > 1 ? "s" : ""} à relier.`
        : "";
      setHealthPendingCount(pendingCount);
      setHealthSyncMessage(`${describeHealthSync(result.fields, result.values, changed || autoLinked.length > 0)}${linkedText}${pendingText}`);
      setHealthSyncDone(true);
    } catch {
      if (aliveRef.current) {
        setHealthSyncMessage("Aucune nouvelle donnée Santé reçue pour l'instant.");
        setHealthSyncDone(true);
      }
    } finally {
      healthSyncRunningRef.current = false;
      lastHealthReturnRef.current = Date.now();
    }
  }, [dispatch]);

  // L'application déjà ouverte redevient visible après le raccourci : même traitement qu'un retour par l'URL.
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      const marker = readHealthSyncMarker();
      // Moins de 1,5 s après le départ : ce n'est pas encore un retour.
      if (marker && Date.now() - marker.startedAt > 1500) void handleHealthReturn();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [handleHealthReturn]);

  // Champ du check-in express : celui choisi à l'onboarding, sinon un champ « Humeur » sur une échelle.
  const quickField = React.useMemo(() => {
    const chosen = activeFields.find(f => f.id === user?.preferences?.quickCheckinFieldId);
    if (chosen && chosen.fieldType === FieldType.NUMBER) return chosen;
    return activeFields.find(f => f.fieldType === FieldType.NUMBER && /humeur/i.test(f.name) && f.min != null && f.max != null);
  }, [activeFields, user?.preferences?.quickCheckinFieldId]);
  const todayLog = React.useMemo(
    () => state.logs.find(l => new Date(l.logDate).toISOString().split("T")[0] === localDateStr()),
    [state.logs],
  );

  const handleQuickCheckin = async (level: number) => {
    if (!quickField) return;
    setQuickSaving(true);
    const payload: DailyEntryPayload = {
      logId: todayLog?.id,
      logDate: localDateStr(),
      notes: todayLog?.notes,
      values: [{ customFieldId: quickField.id, value: moodLevelToValue(quickField, level) }],
      clearedFieldIds: [],
    };
    try {
      await apiService.post("/health/daily-logs/entry", payload);
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
    } catch (err) {
      if (isNetworkFailure(err)) {
        queueEntry(payload);
        dispatch({ type: "SET_NOTICE", notice: "Hors ligne : votre humeur est gardée sur cet appareil et sera envoyée dès le retour du réseau." });
      } else {
        dispatch({ type: "SET_ERROR", error: (err as AppError).message || "L'humeur n'a pas pu être enregistrée." });
      }
    } finally {
      setQuickSaving(false);
    }
  };

  // Le bouton central de la barre du bas ouvre la saisie du jour.
  const openTodayRef = React.useRef(openToday);
  const openDayRef = React.useRef<(dateStr: string) => void>(() => undefined);
  useEffect(() => {
    openTodayRef.current = openToday;
    // Ouvre la journée demandée par un lien (?date=AAAA-MM-JJ) si elle existe dans le journal.
    openDayRef.current = (dateStr: string) => {
      const log = state.logs.find(l => new Date(l.logDate).toISOString().split("T")[0] === dateStr);
      if (!log) return;
      setCalendarDate(new Date(`${dateStr}T12:00:00`));
      handleOpen(log);
    };
  });
  // Tant que les journaux chargent, on diffère l'ouverture : sinon la saisie partirait en création et doublerait l'entrée du jour.
  const loadingRef = React.useRef(state.loading);
  const pendingNewRef = React.useRef(false);
  const [pendingTick, setPendingTick] = React.useState(0);
  useEffect(() => {
    loadingRef.current = state.loading;
  }, [state.loading]);
  useEffect(() => {
    const onNewEntry = () => {
      if (loadingRef.current) {
        pendingNewRef.current = true;
        setPendingTick(t => t + 1);
      } else {
        openTodayRef.current();
      }
    };
    window.addEventListener(NEW_ENTRY_EVENT, onNewEntry);
    return () => window.removeEventListener(NEW_ENTRY_EVENT, onNewEntry);
  }, []);
  // Un compte sans aucun champ n'a rien à saisir : on l'envoie choisir quoi suivre.
  useEffect(() => {
    if (!state.loading && mounted && !state.error && state.fields.length === 0) {
      router.replace("/onboarding");
    }
  }, [state.loading, state.error, state.fields.length, mounted, router]);

  useEffect(() => {
    if (state.loading || !mounted) return;
    if (pendingNewRef.current) {
      pendingNewRef.current = false;
      openTodayRef.current();
    }
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceReady(new URLSearchParams(window.location.search).get("voice") === "1");
      openTodayRef.current();
      router.replace("/dashboard", { scroll: false });
    }
    if (new URLSearchParams(window.location.search).get("healthSync") === "1" && !healthSyncHandledRef.current) {
      healthSyncHandledRef.current = true;
      void handleHealthReturn();
      router.replace("/dashboard", { scroll: false });
    } else if (!healthSyncHandledRef.current) {
      // iOS a pu recharger l'application pendant le raccourci : le marqueur suffit à reconnaître le retour.
      const marker = readHealthSyncMarker();
      if (marker && Date.now() - marker.startedAt > 1500) {
        healthSyncHandledRef.current = true;
        void handleHealthReturn();
      }
    }
    const dateParam = new URLSearchParams(window.location.search).get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      openDayRef.current(dateParam);
      router.replace("/dashboard", { scroll: false });
    }
  }, [state.loading, mounted, router, pendingTick, handleHealthReturn]);

  const { loading, error, notice, dialogError, autofillFields, dialog, formData } = state;
  // Note du jour telle que le serveur la détient : sert à savoir si le formulaire contient du texte pas encore enregistré.
  const savedNotes = state.logs.find(l => new Date(l.logDate).toISOString().split("T")[0] === formData.date)?.notes ?? "";

  return !mounted ? (
    <Paper sx={{ p: 2, borderRadius: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
      <CircularProgress />
    </Paper>
  ) : (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <TodayCard
        todayLogged={todayLogged}
        streak={streak}
        last7={last7}
        onOpenToday={openToday}
        quickField={quickField}
        quickLevel={quickField ? valueToMoodLevel(quickField, todayLog?.fieldValues?.find(fv => fv.customFieldId === quickField.id)?.value) : null}
        onQuickCheckin={handleQuickCheckin}
        quickSaving={quickSaving}
      />
      <WellbeingCards logs={state.logs} fields={state.fields} moodField={quickField} />
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h5" component="h2">Mon journal</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tabs
            value={managerTab}
            onChange={(_, v) => setManagerTab(v)}
            aria-label="Affichage du journal"
            sx={{
              minHeight: 36,
              p: 0.375,
              borderRadius: 999,
              bgcolor: "action.hover",
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": { minHeight: 32, minWidth: 0, px: 1.75, py: 0.5, borderRadius: 999, fontSize: "0.8125rem", color: "text.secondary" },
              "& .MuiTab-root.Mui-selected": { bgcolor: "background.paper", color: "text.primary", boxShadow: "0 1px 2px rgba(20, 16, 16, 0.12)" },
            }}
          >
            <Tab label="Calendrier" value="calendar" icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab label="Liste" value="list" icon={<ListIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ display: { xs: "none", md: "inline-flex" } }}
          >
            Ajouter une entrée
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}
      <Snackbar
        open={healthSyncDone}
        autoHideDuration={healthPendingCount > 0 ? 12000 : 6000}
        onClose={() => setHealthSyncDone(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: "calc(88px + env(safe-area-inset-bottom, 0px))", sm: 24 } }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setHealthSyncDone(false)}
          sx={{ width: "100%", alignItems: "center" }}
          action={healthPendingCount > 0 ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => { setHealthSyncDone(false); setProposalsOpen(true); }}
              sx={{ whiteSpace: "nowrap" }}
            >
              Voir les propositions
            </Button>
          ) : undefined}
        >
          {healthSyncMessage}
        </Alert>
      </Snackbar>
      <HealthProposalsDialog open={proposalsOpen} onClose={() => setProposalsOpen(false)} />
      {notice && <Alert severity="info" sx={{ mb: 2 }} onClose={() => dispatch({ type: "SET_NOTICE", notice: null })}>{notice}</Alert>}

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
        onClose={closeDialog}
        isEditing={dialog.isEditing}
        logDate={formData.date}
        setLogDate={(v) => dispatch({ type: "UPDATE_FORM", data: { date: v } })}
        notes={formData.notes}
        setNotes={(v) => dispatch({ type: "UPDATE_FORM", data: { notes: v } })}
        fieldValuesMap={formData.fieldValues}
        onFieldValueChange={handleFieldValueChange}
        subFieldValuesMap={formData.subFieldValues}
        onSubFieldValueChange={(fid, subId, v) => {
          const currentSub = formData.subFieldValues?.[fid] || {};
          dispatch({
            type: "UPDATE_FORM",
            data: {
              subFieldValues: {
                ...formData.subFieldValues,
                [fid]: {
                  ...currentSub,
                  [subId]: v,
                },
              },
            },
          });
        }}
        onSubmit={handleSubmit}
        submitting={dialog.submitting}
        error={dialogError}
        activeFields={activeFields}
        historicalValues={historicalValues}
        agentSources={formData.agentSources}
        onClearAgentValue={handleClearAgentValue}
        onApplyProposals={handleApplyProposals}
        savedNotes={savedNotes}
        onNotesSaved={(log) => dispatch({ type: "UPSERT_LOG", log })}
        autofillFields={autofillFields}
        voiceReady={voiceReady}
        startStep={startStep}
        onStepChange={handleStepChange}
        onBeforeHealthSync={handleBeforeHealthSync}
      />
    </Paper>
    </Box>
  );
};
