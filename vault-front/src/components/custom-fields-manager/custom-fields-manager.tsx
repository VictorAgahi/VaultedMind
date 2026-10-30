"use client";

import React, { useEffect, useCallback, startTransition } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  Grid,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GridViewIcon from "@mui/icons-material/GridView";
import TableRowsIcon from "@mui/icons-material/TableRows";
import { apiService } from "@/services/api.service";
import { AppError, CustomField, FieldType, CreateCustomFieldDto, UpdateCustomFieldDto, SubFieldDefinition } from "@/types";
import { FieldDialog, FieldFormData } from "./field-dialog";

interface CustomFieldsState {
  fields: CustomField[];
  loading: boolean;
  error: string | null;
  dialog: {
    open: boolean;
    isEditing: boolean;
    id: string | null;
    submitting: boolean;
  };
  formData: FieldFormData;
}

type CustomFieldsAction =
  | { type: "SET_FIELDS"; fields: CustomField[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "OPEN_DIALOG"; isEditing: boolean; id?: string | null; formData?: FieldFormData }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "UPDATE_FORM"; data: Partial<FieldFormData> };

const customFieldsReducer = (state: CustomFieldsState, action: CustomFieldsAction): CustomFieldsState => {
  switch (action.type) {
    case "SET_FIELDS": return { ...state, fields: action.fields, loading: false, error: null };
    case "SET_LOADING": return { ...state, loading: action.loading };
    case "SET_ERROR": return { ...state, error: action.error, loading: false };
    case "OPEN_DIALOG": return {
      ...state,
      dialog: { ...state.dialog, open: true, isEditing: action.isEditing, id: action.id || null },
      formData: action.formData || { name: "", fieldType: FieldType.NUMBER, optionsOrder: [], subFields: [], isHourly: false, category: "", rememberLastValue: false, min: "", max: "", appleWatchMetric: "", goalTarget: "", goalDirection: "AT_LEAST" }
    };
    case "CLOSE_DIALOG": return { ...state, dialog: { ...state.dialog, open: false } };
    case "SET_SUBMITTING": return { ...state, dialog: { ...state.dialog, submitting: action.submitting } };
    case "UPDATE_FORM": return { ...state, formData: { ...state.formData, ...action.data } };
    default: return state;
  }
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  [FieldType.NUMBER]: "Nombre",
  [FieldType.BOOLEAN]: "Oui / Non",
  [FieldType.STRING]: "Texte",
  [FieldType.DATE]: "Date",
};

export const CustomFieldsManager: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [fieldsTab, setFieldsTab] = React.useState<"list" | "chips">(isMobile ? "chips" : "list");

  const [state, dispatch] = React.useReducer(customFieldsReducer, {
    fields: [],
    loading: true,
    error: null,
    dialog: { open: false, isEditing: false, id: null, submitting: false },
    formData: { name: "", fieldType: FieldType.NUMBER, optionsOrder: [], subFields: [], isHourly: false, category: "", rememberLastValue: false, min: "", max: "", appleWatchMetric: "", goalTarget: "", goalDirection: "AT_LEAST" }
  });

  const { fields, loading, error, dialog, formData } = state;

  const fetchFields = useCallback(async () => {
    try {
      const data = await apiService.get<CustomField[]>("/health/custom-fields");
      dispatch({ type: "SET_FIELDS", fields: data });
    } catch (err) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Échec du chargement des champs" });
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchFields();
    });
  }, [fetchFields]);

  const handleOpen = (field?: CustomField) => {
    if (field) {
      dispatch({
        type: "OPEN_DIALOG",
        isEditing: true,
        id: field.id,
        formData: {
          name: field.name,
          fieldType: field.fieldType,
          optionsOrder: field.fieldType === FieldType.NUMBER ? [] : (field.optionsOrder || []).map(opt => ({ id: Math.random().toString(36).substr(2, 9), value: opt })),
          subFields: field.subFields ? JSON.parse(JSON.stringify(field.subFields)) : [],
          isHourly: field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly"),
          category: field.category || "",
          rememberLastValue: field.rememberLastValue || false,
          min: field.min !== undefined && field.min !== null ? field.min : "",
          max: field.max !== undefined && field.max !== null ? field.max : "",
          appleWatchMetric: field.appleWatchMetric || "",
          goalTarget: field.goalTarget ?? "",
          goalDirection: field.goalDirection ?? "AT_LEAST",
        }
      });
    } else {
      dispatch({ type: "OPEN_DIALOG", isEditing: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    try {
      let optionsArray: string[] = [];
      let cleanedSubFields: SubFieldDefinition[] | undefined = undefined;

      if (formData.fieldType === FieldType.STRING) {
        optionsArray = formData.optionsOrder.reduce<string[]>((acc, o) => {
          if (o.value.trim() !== "") acc.push(o.value);
          return acc;
        }, []);

        if (formData.subFields && formData.subFields.length > 0) {
          cleanedSubFields = formData.subFields
            .filter((sf) => sf.name.trim() !== "" && sf.triggerValue.trim() !== "")
            .map((sf) => ({
              ...sf,
              name: sf.name.trim(),
              triggerValue: sf.triggerValue.trim(),
              optionsOrder: (sf.optionsOrder || []).map((o) => o.trim()).filter(Boolean),
            }));
        }
      } else if (formData.fieldType === FieldType.NUMBER && formData.isHourly) {
        optionsArray = ["isHourly"];
      }

      if (dialog.isEditing && dialog.id) {
        const updatePayload: UpdateCustomFieldDto = {
          name: formData.name,
          optionsOrder: optionsArray,
          subFields: cleanedSubFields,
          category: formData.category,
          rememberLastValue: formData.rememberLastValue,
          min: formData.min === "" ? undefined : formData.min,
          max: formData.max === "" ? undefined : formData.max,
          appleWatchMetric: formData.appleWatchMetric === "" ? undefined : formData.appleWatchMetric,
          goalTarget: formData.goalTarget === "" || formData.goalTarget === undefined ? null : formData.goalTarget,
          goalDirection: formData.goalTarget === "" || formData.goalTarget === undefined ? null : formData.goalDirection ?? "AT_LEAST",
        };
        await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${dialog.id}`, updatePayload);
      } else {
        const createPayload: CreateCustomFieldDto = {
          name: formData.name,
          fieldType: formData.fieldType,
          optionsOrder: optionsArray,
          subFields: cleanedSubFields,
          category: formData.category,
          rememberLastValue: formData.rememberLastValue,
          min: formData.min === "" ? undefined : formData.min,
          max: formData.max === "" ? undefined : formData.max,
          appleWatchMetric: formData.appleWatchMetric === "" ? undefined : formData.appleWatchMetric,
          goalTarget: formData.goalTarget === "" || formData.goalTarget === undefined ? null : formData.goalTarget,
          goalDirection: formData.goalTarget === "" || formData.goalTarget === undefined ? null : formData.goalDirection ?? "AT_LEAST",
        };
        await apiService.post<CustomField, CreateCustomFieldDto>("/health/custom-fields", createPayload);
      }
      dispatch({ type: "SET_LOADING", loading: true });
      await fetchFields();
      dispatch({ type: "CLOSE_DIALOG" });
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
    } catch (err: unknown) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Erreur lors de l'enregistrement" });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  };

  const handleToggleStatus = async (field: CustomField) => {
    try {
      await apiService.patch(`/health/custom-fields/${field.id}`, { isActive: !field.isActive });
      await fetchFields();
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
    } catch (err) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Échec de la mise à jour du statut" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr ?")) return;
    try {
      await apiService.delete(`/health/custom-fields/${id}`);
      dispatch({ type: "SET_LOADING", loading: true });
      await fetchFields();
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
    } catch (err) {
      const error = err as AppError;
      dispatch({ type: "SET_ERROR", error: error.message || "Impossible de supprimer le champ" });
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      {loading && fields.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
            <Typography variant="h5" component="h2">Mes champs</Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: { xs: "100%", sm: "auto" } }}>
              <Tabs
                value={fieldsTab}
                onChange={(_, v) => setFieldsTab(v)}
                aria-label="Affichage des champs"
                sx={{
                  display: { xs: "none", md: "flex" },
                  minHeight: 36,
                  p: 0.375,
                  borderRadius: 999,
                  bgcolor: "action.hover",
                  "& .MuiTabs-indicator": { display: "none" },
                  "& .MuiTab-root": { minHeight: 32, minWidth: 0, px: 1.75, py: 0.5, borderRadius: 999, fontSize: "0.8125rem", color: "text.secondary" },
                  "& .MuiTab-root.Mui-selected": { bgcolor: "background.paper", color: "text.primary", boxShadow: "0 1px 2px rgba(15, 20, 19, 0.12)" },
                }}
              >
                <Tab label="Cartes" value="chips" icon={<GridViewIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                <Tab label="Tableau" value="list" icon={<TableRowsIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
              </Tabs>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
                sx={{ flex: { xs: 1, sm: "none" } }}
              >
                Nouveau champ
              </Button>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}

          {fieldsTab === "chips" || isMobile ? (
            <Grid container spacing={1.5}>
              {fields.map((field) => {
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.id}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "action.hover",
                        opacity: field.isActive ? 1 : 0.6,
                        display: "grid",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ overflowWrap: "anywhere" }}>
                            {field.name}
                          </Typography>
                          {field.subFields && field.subFields.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {field.subFields.length} sous-champ{field.subFields.length > 1 ? "s" : ""} conditionnel{field.subFields.length > 1 ? "s" : ""}
                            </Typography>
                          )}
                        </Box>
                        <Chip label={FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType} size="small" sx={{ bgcolor: "background.paper", color: "text.secondary", flex: "none" }} />
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: -1, cursor: "pointer" }}>
                          <Switch
                            checked={field.isActive}
                            onChange={() => handleToggleStatus(field)}
                            color="primary"
                          />
                          <Typography variant="body2" color="text.secondary">
                            {field.isActive ? "Actif" : "Désactivé"}
                          </Typography>
                        </Box>

                        <Box sx={{ mr: -1 }}>
                          <IconButton onClick={() => handleOpen(field)} aria-label={`Modifier ${field.name}`} sx={{ color: "text.secondary" }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(field.id)} aria-label={`Supprimer ${field.name}`} sx={{ color: "text.secondary" }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nom</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow key={field.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{field.name}</Typography>
                        {field.subFields && field.subFields.length > 0 && (
                          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block" }}>
                            {field.subFields.length} sous-champ(s)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Chip label={FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType} size="small" variant="outlined" /></TableCell>
                      <TableCell>
                        <Tooltip title={field.isActive ? "Actif" : "Désactivé"}>
                          <Switch checked={field.isActive} onChange={() => handleToggleStatus(field)} color="primary" size="small" />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpen(field)} color="primary"><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(field.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <FieldDialog
        open={dialog.open}
        onClose={() => dispatch({ type: "CLOSE_DIALOG" })}
        isEditing={dialog.isEditing}
        formData={formData}
        setFormData={(data) => {
          if (typeof data === 'function') {
            dispatch({ type: "UPDATE_FORM", data: data(state.formData) });
          } else {
            dispatch({ type: "UPDATE_FORM", data });
          }
        }}
        onSubmit={handleSubmit}
        submitting={dialog.submitting}
      />
    </Paper>
  );
};

