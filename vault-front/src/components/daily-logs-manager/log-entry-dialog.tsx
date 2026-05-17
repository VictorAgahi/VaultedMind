"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from "@mui/material";
import { CustomField, FieldType } from "@/types";

interface LogEntryDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  logDate: string;
  setLogDate: (date: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  fieldValuesMap: Record<string, string>;
  onFieldValueChange: (fieldId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  activeFields: CustomField[];
  historicalValues: Record<string, string[]>;
}

export const LogEntryDialog: React.FC<LogEntryDialogProps> = ({
  open,
  onClose,
  isEditing,
  logDate,
  setLogDate,
  notes,
  setNotes,
  fieldValuesMap,
  onFieldValueChange,
  onSubmit,
  submitting,
  activeFields,
  historicalValues
}) => {
  const renderFieldInput = (field: CustomField) => {
    const value = fieldValuesMap[field.id] || "";

    if (field.fieldType === FieldType.BOOLEAN) {
      return (
        <FormControl fullWidth margin="dense" key={field.id}>
          <InputLabel>{field.name}</InputLabel>
          <Select
            value={value}
            label={field.name}
            onChange={(e) => onFieldValueChange(field.id, e.target.value)}
            MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300, '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' } } } } }}
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
          onChange={(e) => onFieldValueChange(field.id, e.target.value)}
        />
      );
    }

    const isHourly = field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly");

    if (isHourly) {
      let timeValue = "";
      if (value) {
        if (/^\d{2}:\d{2}$/.test(value)) {
          timeValue = value;
        } else if (value.includes("h") || value.includes(":")) {
          const clean = value.replace("h", ":");
          const parts = clean.split(":");
          const h = parseInt(parts[0], 10);
          const m = parts[1] ? parseInt(parts[1], 10) : 0;
          if (!isNaN(h)) {
            timeValue = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          }
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            const hours = Math.floor(num);
            const minutes = Math.round((num - hours) * 60);
            timeValue = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          }
        }
      }

      return (
        <TextField
          key={field.id}
          margin="dense"
          label={field.name}
          type="time"
          fullWidth
          variant="outlined"
          slotProps={{ 
            inputLabel: { shrink: true }
          }}
          value={timeValue}
          onChange={(e) => onFieldValueChange(field.id, e.target.value)}
          helperText="Format horaire (converti en décimal pour les analyses)"
        />
      );
    }

    const options = historicalValues[field.id] || [];

    return (
      <Autocomplete
        key={field.id}
        freeSolo
        options={options}
        value={value}
        onInputChange={(_, newInputValue) => onFieldValueChange(field.id, newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            margin="dense"
            label={field.name}
            type={field.fieldType === FieldType.NUMBER ? "number" : "text"}
            fullWidth
            variant="outlined"
          />
        )}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={onSubmit}>
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
              Vous n&apos;avez aucun champ personnalisé actif.
            </Alert>
          ) : (
            <Box
              sx={{
                maxHeight: 320,
                overflowY: "auto",
                pr: 1,
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
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
