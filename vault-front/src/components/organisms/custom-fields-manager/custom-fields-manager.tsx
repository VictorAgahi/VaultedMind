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
import { CustomField, FieldType, CreateCustomFieldDto, UpdateCustomFieldDto } from "@/types";

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
  const [submitting, setSubmitting] = useState(false);

  const fetchFields = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.get<CustomField[]>("/health/custom-fields");
      setFields(data);
    } catch {
      setError("Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFields();
  }, [fetchFields]);

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setIsEditing(true);
      setCurrentFieldId(field.id);
      setName(field.name);
      setFieldType(field.fieldType);
    } else {
      setIsEditing(false);
      setCurrentFieldId(null);
      setName("");
      setFieldType(FieldType.STRING);
    }
    setOpenDialog(true);
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
          { name }
        );
      } else {
        await apiService.post<CustomField, CreateCustomFieldDto>(
          "/health/custom-fields",
          { name, fieldType }
        );
      }
      await fetchFields();
      window.dispatchEvent(new Event("vaultedmind:fields-updated"));
      handleCloseDialog();
    } catch (err: unknown) {
      const apiError = err as import("@/types").ApiError;
      setError(apiError.message || "Operation failed");
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
      setError("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this field?")) {
      try {
        await apiService.delete(`/health/custom-fields/${id}`);
        await fetchFields();
        window.dispatchEvent(new Event("vaultedmind:fields-updated"));
      } catch {
        setError("Failed to delete field");
      }
    }
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Manage Custom Fields
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Field
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
                secondary={`Type: ${field.fieldType}`}
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
              No custom fields configured yet. Add one to get started!
            </Typography>
          )}
        </List>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Custom Field"}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Field Name"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2, mt: 1 }}
            />
            {!isEditing && (
              <FormControl fullWidth variant="outlined">
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as FieldType)}
                  label="Field Type"
                >
                  <MenuItem value={FieldType.STRING}>Text (String)</MenuItem>
                  <MenuItem value={FieldType.NUMBER}>Number</MenuItem>
                  <MenuItem value={FieldType.BOOLEAN}>Yes/No (Boolean)</MenuItem>
                  <MenuItem value={FieldType.DATE}>Date</MenuItem>
                </Select>
              </FormControl>
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
