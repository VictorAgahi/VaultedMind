"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { apiService } from "@/services/api.service";
import { CustomField, FieldType, CreateCustomFieldDto, UpdateCustomFieldDto, DailyLog } from "@/types";
import { Chip, Stack, Divider } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

export const CustomFieldsManager: React.FC = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>(FieldType.STRING);
  const [optionsOrder, setOptionsOrder] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [historicalOptions, setHistoricalOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchFields = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await apiService.get<CustomField[]>("/health/custom-fields", { signal });
      setFields(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError("Échec du chargement des champs personnalisés");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFields(controller.signal);
    return () => controller.abort();
  }, [fetchFields]);

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setIsEditing(true);
      setCurrentFieldId(field.id);
      setName(field.name);
      setFieldType(field.fieldType);
      setOptionsOrder(field.optionsOrder || []);
      fetchHistoricalValues(field.id);
    } else {
      setIsEditing(false);
      setCurrentFieldId(null);
      setName("");
      setFieldType(FieldType.STRING);
      setOptionsOrder([]);
      setHistoricalOptions([]);
    }
    setOpenDialog(true);
  };

  const fetchHistoricalValues = async (fieldId: string) => {
    try {
      const logs = await apiService.get<DailyLog[]>("/health/daily-logs");
      const values = new Set<string>();
      logs.forEach(log => {
        log.fieldValues?.forEach(fv => {
          if (fv.customFieldId === fieldId && fv.value && fv.value.trim() !== "") {
            values.add(fv.value);
          }
        });
      });
      setHistoricalOptions(Array.from(values).sort());
    } catch (error) {
      console.error("Failed to fetch historical values", error);
    }
  };

  const handleAddOption = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !optionsOrder.includes(trimmed)) {
      setOptionsOrder([...optionsOrder, trimmed]);
      setNewValue("");
    }
  };

  const handleRemoveOption = (val: string) => {
    setOptionsOrder(optionsOrder.filter(o => o !== val));
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...optionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setOptionsOrder(newOrder);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing && currentFieldId) {
        await apiService.patch<CustomField, UpdateCustomFieldDto>(
          `/health/custom-fields/${currentFieldId}`,
          { name, optionsOrder: optionsOrder.length > 0 ? optionsOrder : undefined }
        );
      } else {
        await apiService.post<CustomField, CreateCustomFieldDto>(
          "/health/custom-fields",
          { name, fieldType, optionsOrder: optionsOrder.length > 0 ? optionsOrder : undefined }
        );
      }
      await fetchFields();
      window.dispatchEvent(new Event("vaultedmind:fields-updated"));
      handleCloseDialog();
    } catch (err: unknown) {
      const apiError = err as import("@/types").ApiError;
      setError(apiError.message || "L'opération a échoué");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (field: CustomField) => {
    try {
      await apiService.patch<CustomField, UpdateCustomFieldDto>(
        `/health/custom-fields/${field.id}`,
        { isActive: !field.isActive }
      );
      await fetchFields();
      window.dispatchEvent(new Event("vaultedmind:fields-updated"));
    } catch {
      setError("Échec de la mise à jour du statut");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce champ ?")) {
      try {
        await apiService.delete(`/health/custom-fields/${id}`);
        await fetchFields();
        window.dispatchEvent(new Event("vaultedmind:fields-updated"));
      } catch {
        setError("Échec de la suppression du champ");
      }
    }
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Gérer les champs personnalisés
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Ajouter un champ
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box 
          sx={{ 
            maxHeight: 450, 
            overflowY: "auto", 
            pr: 1,
            // Custom scrollbar for premium look
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
            "&::-webkit-scrollbar-thumb": { 
              bgcolor: "rgba(0,0,0,0.1)", 
              borderRadius: 3,
              "&:hover": { bgcolor: "rgba(0,0,0,0.2)" }
            }
          }}
        >
          <List>
            {fields.map((field) => (
              <ListItem
                key={field.id}
                sx={{
                  bgcolor: "background.default",
                  mb: 1,
                  borderRadius: 2,
                  opacity: field.isActive ? 1 : 0.6
                }}
              >
                <ListItemText
                  primary={field.name}
                  secondary={`Type : ${
                    field.fieldType === FieldType.STRING ? "Texte" :
                    field.fieldType === FieldType.NUMBER ? "Nombre" :
                    field.fieldType === FieldType.BOOLEAN ? "Oui/Non" : "Date"
                  }`}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={field.isActive}
                    onChange={() => handleToggleActive(field)}
                    color="primary"
                  />
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(field)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(field.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {fields.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Aucun champ personnalisé configuré pour le moment. Ajoutez-en un pour commencer !
              </Typography>
            )}
          </List>
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? "Modifier le champ" : "Ajouter un champ personnalisé"}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom du champ"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2, mt: 1 }}
            />
            {!isEditing && (
              <FormControl fullWidth variant="outlined">
                <InputLabel>Type de champ</InputLabel>
                <Select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as FieldType)}
                  label="Type de champ"
                >
                  <MenuItem value={FieldType.STRING}>Texte (String)</MenuItem>
                  <MenuItem value={FieldType.NUMBER}>Nombre</MenuItem>
                  <MenuItem value={FieldType.BOOLEAN}>Oui/Non (Booléen)</MenuItem>
                  <MenuItem value={FieldType.DATE}>Date</MenuItem>
                </Select>
              </FormControl>
            )}

            {fieldType === FieldType.STRING && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Classement des valeurs (pour les graphiques)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Définissez l&apos;ordre des valeurs (ex: Faible, Moyen, Élevé). Les valeurs non listées seront ignorées sur les graphiques d&apos;évolution.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
                  <TextField
                    size="small"
                    label="Ajouter une valeur"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption(newValue))}
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "transparent"
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleAddOption(newValue)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: "#d81832",
                      "&:hover": { bgcolor: "#b01328" }
                    }}
                  >
                    Ajouter
                  </Button>
                </Box>

                {historicalOptions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                      Valeurs existantes dans vos journaux :
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
                      {historicalOptions.filter(opt => !optionsOrder.includes(opt)).map(opt => (
                        <Chip
                          key={opt}
                          label={opt}
                          size="small"
                          onClick={() => handleAddOption(opt)}
                          icon={<AddIcon style={{ fontSize: 16 }} />}
                          variant="outlined"
                          sx={{
                            borderRadius: 1.5,
                            borderColor: "rgba(216, 24, 50, 0.3)",
                            "&:hover": {
                              bgcolor: "rgba(216, 24, 50, 0.08)",
                              borderColor: "#d81832"
                            }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Box sx={{
                  bgcolor: "rgba(216, 24, 50, 0.04)",
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid rgba(216, 24, 50, 0.1)"
                }}>
                  <Typography variant="caption" sx={{
                    display: "block",
                    mb: 2,
                    fontWeight: 700,
                    color: "#d81832",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Ordre défini
                  </Typography>
                  <Stack spacing={1.5}>
                    {optionsOrder.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 2 }}>
                        Aucun ordre personnalisé défini.
                      </Typography>
                    ) : (
                      optionsOrder.map((opt, idx) => (
                        <Box
                          key={opt}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            bgcolor: "white",
                            p: 1.5,
                            px: 2,
                            borderRadius: 2,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            border: "1px solid #eee",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            "&:hover": {
                              transform: "translateY(-1px)",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            }
                          }}
                        >
                          <DragIndicatorIcon sx={{ color: "#9ca3af", mr: 2, fontSize: 20 }} />
                          <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600, color: "#1f2937" }}>{opt}</Typography>

                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => moveOption(idx, 'up')}
                              disabled={idx === 0}
                              sx={{
                                color: "#d81832",
                                "&.Mui-disabled": { color: "#e5e7eb" }
                              }}
                            >
                              <Typography sx={{ fontWeight: 800 }}>↑</Typography>
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => moveOption(idx, 'down')}
                              disabled={idx === optionsOrder.length - 1}
                              sx={{
                                color: "#d81832",
                                "&.Mui-disabled": { color: "#e5e7eb" }
                              }}
                            >
                              <Typography sx={{ fontWeight: 800 }}>↓</Typography>
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveOption(opt)}
                              sx={{
                                color: "#ef4444",
                                ml: 1,
                                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Box>
                      ))
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
};
