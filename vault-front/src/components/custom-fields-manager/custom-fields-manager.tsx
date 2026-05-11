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
  Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiService } from "@/services/api.service";
import { AppError, CustomField, FieldType, CreateCustomFieldDto, UpdateCustomFieldDto } from "@/types";
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
      formData: action.formData || { name: "", fieldType: FieldType.NUMBER, optionsOrder: [] }
    };
    case "CLOSE_DIALOG": return { ...state, dialog: { ...state.dialog, open: false } };
    case "SET_SUBMITTING": return { ...state, dialog: { ...state.dialog, submitting: action.submitting } };
    case "UPDATE_FORM": return { ...state, formData: { ...state.formData, ...action.data } };
    default: return state;
  }
};

export const CustomFieldsManager: React.FC = () => {
  const [state, dispatch] = React.useReducer(customFieldsReducer, {
    fields: [],
    loading: true,
    error: null,
    dialog: { open: false, isEditing: false, id: null, submitting: false },
    formData: { name: "", fieldType: FieldType.NUMBER, optionsOrder: [] }
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
          optionsOrder: (field.optionsOrder || []).map(opt => ({ id: Math.random().toString(36).substr(2, 9), value: opt }))
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
      const optionsArray = formData.optionsOrder.reduce<string[]>((acc, o) => {
        if (o.value.trim() !== "") acc.push(o.value);
        return acc;
      }, []);

      if (dialog.isEditing && dialog.id) {
        const updatePayload: UpdateCustomFieldDto = {
          name: formData.name,
          optionsOrder: optionsArray
        };
        await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${dialog.id}`, updatePayload);
      } else {
        const createPayload: CreateCustomFieldDto = {
          ...formData,
          optionsOrder: optionsArray
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
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      {loading && fields.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Champs Personnalisés</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Nouveau Champ</Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}

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
                    </TableCell>
                    <TableCell><Chip label={field.fieldType} size="small" variant="outlined" /></TableCell>
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

