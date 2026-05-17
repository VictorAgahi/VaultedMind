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
      formData: action.formData || { name: "", fieldType: FieldType.NUMBER, optionsOrder: [], isHourly: false }
    };
    case "CLOSE_DIALOG": return { ...state, dialog: { ...state.dialog, open: false } };
    case "SET_SUBMITTING": return { ...state, dialog: { ...state.dialog, submitting: action.submitting } };
    case "UPDATE_FORM": return { ...state, formData: { ...state.formData, ...action.data } };
    default: return state;
  }
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
    formData: { name: "", fieldType: FieldType.NUMBER, optionsOrder: [], isHourly: false }
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
          isHourly: field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")
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
      if (formData.fieldType === FieldType.STRING) {
        optionsArray = formData.optionsOrder.reduce<string[]>((acc, o) => {
          if (o.value.trim() !== "") acc.push(o.value);
          return acc;
        }, []);
      } else if (formData.fieldType === FieldType.NUMBER && formData.isHourly) {
        optionsArray = ["isHourly"];
      }

      if (dialog.isEditing && dialog.id) {
        const updatePayload: UpdateCustomFieldDto = {
          name: formData.name,
          optionsOrder: optionsArray
        };
        await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${dialog.id}`, updatePayload);
      } else {
        const createPayload: CreateCustomFieldDto = {
          name: formData.name,
          fieldType: formData.fieldType,
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
    <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4 }}>
      {loading && fields.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Champs Personnalisés</Typography>
              <Tabs
                value={fieldsTab}
                onChange={(_, v) => setFieldsTab(v)}
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, textTransform: "none" },
                  '& .Mui-selected': { color: '#6366f1 !important', bgcolor: 'rgba(99, 102, 241, 0.08)' },
                  '& .MuiTabs-indicator': { display: 'none' }
                }}
              >
                <Tab label="Cartes" value="chips" icon={<GridViewIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                <Tab label="Tableau" value="list" icon={<TableRowsIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
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
              Nouveau Champ
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: "SET_ERROR", error: null })}>{error}</Alert>}

          {fieldsTab === "chips" ? (
            <Grid container spacing={2}>
              {fields.map((field) => {
                let color = "#6366f1";
                let bgColor = "rgba(99, 102, 241, 0.04)";
                let borderColor = "rgba(99, 102, 241, 0.12)";
                
                if (field.fieldType === FieldType.BOOLEAN) {
                  color = "#10b981";
                  bgColor = "rgba(16, 185, 129, 0.04)";
                  borderColor = "rgba(16, 185, 129, 0.12)";
                } else if (field.fieldType === FieldType.STRING) {
                  color = "#8b5cf6";
                  bgColor = "rgba(139, 92, 246, 0.04)";
                  borderColor = "rgba(139, 92, 246, 0.12)";
                }

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 4,
                        border: "1px solid",
                        borderColor: borderColor,
                        bgcolor: field.isActive ? "background.paper" : "rgba(0,0,0,0.02)",
                        transition: "all 0.2s ease-in-out",
                        opacity: field.isActive ? 1 : 0.75,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.01)",
                        '&:hover': {
                          transform: "translateY(-2px)",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
                          borderColor: color
                        }
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#142949" }}>
                          {field.name}
                        </Typography>
                        <Chip 
                          label={field.fieldType} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            color: color, 
                            bgcolor: bgColor, 
                            borderColor: borderColor,
                            border: "1px solid"
                          }} 
                        />
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Switch 
                            checked={field.isActive} 
                            onChange={() => handleToggleStatus(field)} 
                            color="primary" 
                            size="small" 
                          />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                            {field.isActive ? "Actif" : "Désactivé"}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <IconButton size="small" onClick={() => handleOpen(field)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(field.id)} color="error">
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

