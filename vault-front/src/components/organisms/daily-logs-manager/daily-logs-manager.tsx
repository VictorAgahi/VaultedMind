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

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields"),
        apiService.get<DailyLog[]>("/health/daily-logs")
      ]);
      setFields(fieldsData);

      // Sort logs by date descending
      const sortedLogs = logsData.sort(
        (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
      );
      setLogs(sortedLogs);
    } catch {
      setError("Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();

    const handleFieldsUpdated = () => {
      fetchData();
    };

    const handleLogsImported = () => {
      console.log("🔄 Logs imported event received, refreshing data...");
      setLoading(true);
      fetchData();
    };

    window.addEventListener("vaultedmind:fields-updated", handleFieldsUpdated);
    window.addEventListener("vaultedmind:logs-imported", handleLogsImported);
    return () => {
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
  }, [logs]);

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
    if (window.confirm(`Delete the log for ${new Date(logDate).toLocaleDateString()}? This cannot be undone.`)) {
      try {
        await apiService.delete(`/health/daily-logs/${logId}`);
        setError(null);
        await fetchData();
      } catch {
        setError("Failed to delete log");
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
      setError(apiError.message || "Operation failed");
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
          Daily Tracking
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Daily Log
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filter & Sort Section */}
      <Box sx={{ mb: 4, p: 2, bgcolor: "#ede5d9", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {activeFields.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
              Filter by fields (show logs with ALL selected fields):
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
                  placeholder="Select fields to filter..."
                  size="small"
                />
              )}
              sx={{ maxWidth: 600 }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel size="small">Sort by Date</InputLabel>
            <Select
              value={sortOrder}
              label="Sort by Date"
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              size="small"
            >
              <MenuItem value="desc">Newest First (↓)</MenuItem>
              <MenuItem value="asc">Oldest First (↑)</MenuItem>
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
              Clear Filters
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
                      ? "No logs match the selected filters. Try adjusting your selection."
                      : "No daily logs found. Start tracking!"}
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
                      <IconButton size="small" onClick={() => handleOpenDialog(log)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLog(log.id, log.logDate)}
                        title="Delete"
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
          <DialogTitle>{isEditing ? "Edit Daily Log" : "New Daily Log"}</DialogTitle>
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
                label="General Notes"
                fullWidth
                variant="outlined"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How was your day?"
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Custom Trackers
            </Typography>

            {activeFields.length === 0 ? (
              <Alert severity="info">
                You have no active custom fields. Create some in the &quot;Manage Custom Fields&quot; section.
              </Alert>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                {activeFields.map(renderFieldInput)}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
};
