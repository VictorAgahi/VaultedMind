"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { apiService } from "@/services/api.service";
import {
  CustomField,
  FieldType,
  DailyLog,
  CreateDailyLogDto,
  UpdateDailyLogDto,
  SaveFieldValueDto
} from "@/types";

export const DailyLogsManager: React.FC = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);

  // Form state
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [fieldValuesMap, setFieldValuesMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [selectedFieldFilters, setSelectedFieldFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal })
      ]);
      setFields(fieldsData);

      // Sort logs by date descending
      const sortedLogs = logsData.sort(
        (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
      );
      setLogs(sortedLogs);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError("Échec du chargement des données de suivi");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(controller.signal);

    const handleFieldsUpdated = () => {
      fetchData();
    };

    const handleLogsImported = () => {
      console.log("🔄 Logs imported event received, refreshing data...");
      fetchData();
    };

    window.addEventListener("vaultedmind:fields-updated", handleFieldsUpdated);
    window.addEventListener("vaultedmind:logs-imported", handleLogsImported);
    return () => {
      controller.abort();
      window.removeEventListener("vaultedmind:fields-updated", handleFieldsUpdated);
      window.removeEventListener("vaultedmind:logs-imported", handleLogsImported);
    };
  }, [fetchData]);

  const activeFields = useMemo(() => fields.filter(f => f.isActive), [fields]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply field filters
    if (selectedFieldFilters.length > 0) {
      result = result.filter(log => {
        return selectedFieldFilters.every(fieldId => {
          return log.fieldValues?.some(fv => fv.customFieldId === fieldId && fv.value);
        });
      });
    }

    // Apply sort order
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.logDate).getTime();
      const dateB = new Date(b.logDate).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [logs, selectedFieldFilters, sortOrder]);

  const historicalValues = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    // Add values from optionsOrder (the new custom sorting)
    fields.forEach(field => {
      if (field.optionsOrder && field.optionsOrder.length > 0) {
        if (!map[field.id]) {
          map[field.id] = new Set();
        }
        field.optionsOrder.forEach(opt => map[field.id].add(opt));
      }
    });

    // Add values already present in logs
    logs.forEach(log => {
      log.fieldValues?.forEach(fv => {
        if (fv.value && fv.value.trim() !== '') {
          if (!map[fv.customFieldId]) {
            map[fv.customFieldId] = new Set();
          }
          map[fv.customFieldId].add(fv.value);
        }
      });
    });

    const result: Record<string, string[]> = {};
    for (const [key, set] of Object.entries(map)) {
      result[key] = Array.from(set).sort();
    }
    return result;
  }, [logs, fields]);

  const handleOpenDialog = (log?: DailyLog) => {
    if (log) {
      setIsEditing(true);
      setCurrentLogId(log.id);
      // Format date to YYYY-MM-DD
      setLogDate(new Date(log.logDate).toISOString().split("T")[0]);
      setNotes(log.notes || "");

      const valuesMap: Record<string, string> = {};
      if (log.fieldValues) {
        log.fieldValues.forEach(fv => {
          valuesMap[fv.customFieldId] = fv.value;
        });
      }
      setFieldValuesMap(valuesMap);
    } else {
      setIsEditing(false);
      setCurrentLogId(null);
      setLogDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setFieldValuesMap({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleDeleteLog = async (logId: string, logDate: string) => {
    if (window.confirm(`Supprimer le journal du ${new Date(logDate).toLocaleDateString()} ? Cette action est irréversible.`)) {
      try {
        await apiService.delete(`/health/daily-logs/${logId}`);
        setError(null);
        await fetchData();
      } catch {
        setError("Échec de la suppression du journal");
      }
    }
  };

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValuesMap(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let logId = currentLogId;

      if (isEditing && logId) {
        // Update log
        await apiService.patch<DailyLog, UpdateDailyLogDto>(
          `/health/daily-logs/${logId}`,
          { logDate, notes }
        );
      } else {
        // Create log
        const newLog = await apiService.post<DailyLog, CreateDailyLogDto>(
          "/health/daily-logs",
          { logDate, notes }
        );
        logId = newLog.id;
      }

      // Save field values
      const savePromises = Object.entries(fieldValuesMap).map(([customFieldId, value]) => {
        // We might want to optimize this by checking if value actually changed
        // But for simplicity, we just save/overwrite them.
        // Wait, the backend endpoint is POST /health/daily-logs/:logId/values
        if (value.trim() !== "") {
          return apiService.post<void, SaveFieldValueDto>(
            `/health/daily-logs/${logId}/values`,
            { customFieldId, value }
          );
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);
      await fetchData();
      handleCloseDialog();
    } catch (err: unknown) {
      const apiError = err as import("@/types").ApiError;
      setError(apiError.message || "L'opération a échoué");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldValue = (log: DailyLog, fieldId: string) => {
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!fv) return "-";

    const field = fields.find(f => f.id === fieldId);
    if (field?.fieldType === FieldType.BOOLEAN) {
      return fv.value === "true" ? "Oui" : "Non";
    }
    return fv.value;
  };

  const renderFieldInput = (field: CustomField) => {
    const value = fieldValuesMap[field.id] || "";

    if (field.fieldType === FieldType.BOOLEAN) {
      return (
        <FormControl fullWidth margin="dense" key={field.id}>
          <InputLabel>{field.name}</InputLabel>
          <Select
            value={value}
            label={field.name}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
          >
            <MenuItem value=""><em>Non renseigné</em></MenuItem>
            <MenuItem value="true">Oui</MenuItem>
            <MenuItem value="false">Non</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (field.fieldType === FieldType.DATE) {
      return (
        <TextField
          key={field.id}
          margin="dense"
          label={field.name}
          type="date"
          fullWidth
          variant="outlined"
          slotProps={{ inputLabel: { shrink: true } }}
          value={value}
          onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
        />
      );
    }

    // Default STRING or NUMBER with Autocomplete for historical values
    const options = historicalValues[field.id] || [];

    return (
      <Autocomplete
        key={field.id}
        freeSolo
        options={options}
        value={value}
        onInputChange={(_, newInputValue) => handleFieldValueChange(field.id, newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            margin="dense"
            label={field.name}
            type={field.fieldType === FieldType.NUMBER ? "number" : "text"}
            fullWidth
            variant="outlined"
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
          />
        )}
      />
    );
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4, mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Suivi Quotidien
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Ajouter un journal
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filter & Sort Section */}
      <Box sx={{ mb: 4, p: 2, bgcolor: "#ede5d9", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {activeFields.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
              Filtrer par champs (affiche les journaux avec TOUS les champs sélectionnés) :
            </Typography>
            <Autocomplete
              multiple
              options={activeFields}
              getOptionLabel={(field) => field.name}
              value={activeFields.filter(f => selectedFieldFilters.includes(f.id))}
              onChange={(_, newValue) => {
                setSelectedFieldFilters(newValue.map(f => f.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Sélectionner des champs..."
                  size="small"
                />
              )}
              sx={{ maxWidth: 600 }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel size="small">Trier par date</InputLabel>
            <Select
              value={sortOrder}
              label="Trier par date"
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              size="small"
            >
              <MenuItem value="desc">Plus récent (↓)</MenuItem>
              <MenuItem value="asc">Plus ancien (↑)</MenuItem>
            </Select>
          </FormControl>
          {(selectedFieldFilters.length > 0 || sortOrder !== "desc") && (
            <Button
              size="small"
              onClick={() => {
                setSelectedFieldFilters([]);
                setSortOrder("desc");
              }}
              variant="outlined"
            >
              Réinitialiser
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                {activeFields.map(field => (
                  <TableCell key={field.id} sx={{ fontWeight: "bold" }}>
                    {field.name}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeFields.length + 3} align="center" sx={{ py: 3 }}>
                    {selectedFieldFilters.length > 0
                      ? "Aucun journal ne correspond aux filtres sélectionnés. Essayez d'ajuster votre sélection."
                      : "Aucun journal trouvé. Commencez votre suivi !"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {new Date(log.logDate).toLocaleDateString()}
                    </TableCell>
                    {activeFields.map(field => (
                      <TableCell key={field.id}>
                        {renderFieldValue(log, field.id)}
                      </TableCell>
                    ))}
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.notes || "-"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(log)} title="Modifier">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLog(log.id, log.logDate)}
                        title="Supprimer"
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? "Modifier le journal" : "Nouveau journal"}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
              <TextField
                label="Date"
                type="date"
                fullWidth
                variant="outlined"
                slotProps={{ inputLabel: { shrink: true } }}
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
              />
              <TextField
                label="Notes générales"
                fullWidth
                variant="outlined"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Comment s'est passée votre journée ?"
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Champs personnalisés
            </Typography>

            {activeFields.length === 0 ? (
              <Alert severity="info">
                Vous n&apos;avez aucun champ personnalisé actif. Créez-en dans la section &quot;Gérer les champs&quot;.
              </Alert>
            ) : (
              <Box 
                sx={{ 
                  maxHeight: 320, 
                  overflowY: "auto", 
                  pr: 1,
                  // Custom scrollbar
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                  "&::-webkit-scrollbar-thumb": { 
                    bgcolor: "rgba(0,0,0,0.08)", 
                    borderRadius: 3,
                    "&:hover": { bgcolor: "rgba(0,0,0,0.15)" }
                  }
                }}
              >
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, p: 0.5 }}>
                  {activeFields.map(renderFieldInput)}
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
