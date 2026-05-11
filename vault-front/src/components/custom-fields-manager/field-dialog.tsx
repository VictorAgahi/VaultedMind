"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { FieldType } from "@/types";

interface OptionItem {
  id: string;
  value: string;
}

export interface FieldFormData {
  name: string;
  fieldType: FieldType;
  optionsOrder: OptionItem[];
}

interface FieldDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: FieldFormData;
  setFormData: React.Dispatch<React.SetStateAction<FieldFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const FieldDialog: React.FC<FieldDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) => {
  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      optionsOrder: [...prev.optionsOrder, { id: crypto.randomUUID(), value: "" }],
    }));
  };

  const handleOptionChange = (id: string, val: string) => {
    setFormData((prev) => ({
      ...prev,
      optionsOrder: prev.optionsOrder.map(opt => opt.id === id ? { ...opt, value: val } : opt),
    }));
  };

  const handleRemoveOption = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      optionsOrder: prev.optionsOrder.filter((opt) => opt.id !== id),
    }));
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const newOptions = [...formData.optionsOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];

    setFormData((prev) => ({ ...prev, optionsOrder: newOptions }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={onSubmit}>
        <DialogTitle>{isEditing ? "Modifier le champ" : "Nouveau champ"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 1 }}>
            <TextField
              label="Nom du champ"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Humeur, Sommeil, Poids..."
            />

            <FormControl fullWidth>
              <InputLabel>Type de donnée</InputLabel>
              <Select
                value={formData.fieldType}
                label="Type de donnée"
                onChange={(e) => setFormData((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))}
              >
                <MenuItem value={FieldType.NUMBER}>Nombre (ex: 75.5)</MenuItem>
                <MenuItem value={FieldType.STRING}>Texte / Choix (ex: Très bien)</MenuItem>
                <MenuItem value={FieldType.BOOLEAN}>Oui / Non</MenuItem>
              </Select>
            </FormControl>

            {formData.fieldType === FieldType.STRING && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                  Options de réponse (ordre d&apos;affichage)
                </Typography>
                 {formData.optionsOrder.map((opt, idx) => (
                  <Box key={opt.id} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOption(idx, "up")}
                        disabled={idx === 0}
                        sx={{ p: 0.1, color: "primary.main" }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOption(idx, "down")}
                        disabled={idx === formData.optionsOrder.length - 1}
                        sx={{ p: 0.1, color: "primary.main" }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      size="small"
                      fullWidth
                      value={opt.value}
                      onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      sx={{ bgcolor: "background.paper" }}
                    />
                    <IconButton color="error" onClick={() => handleRemoveOption(opt.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddOption}
                  sx={{ mt: 1, borderRadius: 2 }}
                >
                  Ajouter une option
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
