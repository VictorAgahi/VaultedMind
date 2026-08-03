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
  FormControlLabel,
  Switch,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { FieldType, AppleWatchMetric } from "@/types";

interface OptionItem {
  id: string;
  value: string;
}

export interface FieldFormData {
  name: string;
  fieldType: FieldType;
  optionsOrder: OptionItem[];
  isHourly?: boolean;
  category?: string;
  rememberLastValue: boolean;
  min?: number | "";
  max?: number | "";
  appleWatchMetric?: AppleWatchMetric | "";
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

            <TextField
              label="Catégorie (optionnel)"
              fullWidth
              value={formData.category || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Ex: Général, Sommeil, Sport..."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.rememberLastValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rememberLastValue: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Mémoriser la dernière valeur</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pré-remplit ce champ avec la valeur du dernier journal (idéal pour le poids, etc.)
                  </Typography>
                </Box>
              }
              sx={{ ml: 0 }}
            />

            <FormControl fullWidth disabled={isEditing}>
              <InputLabel>Type de donnée</InputLabel>
              <Select
                value={formData.fieldType}
                label="Type de donnée"
                onChange={(e) => setFormData((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        maxHeight: 300,
                        '&::-webkit-scrollbar': { width: '8px' },
                        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }
                      }
                    }
                  }
                }}
              >
                <MenuItem value={FieldType.NUMBER}>Nombre (ex: 75.5)</MenuItem>
                <MenuItem value={FieldType.STRING}>Texte / Choix (ex: Très bien)</MenuItem>
                <MenuItem value={FieldType.BOOLEAN}>Oui / Non</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Associer à une métrique Apple Watch (optionnel)</InputLabel>
              <Select
                value={formData.appleWatchMetric || ""}
                label="Associer à une métrique Apple Watch (optionnel)"
                onChange={(e) => setFormData((prev) => ({ ...prev, appleWatchMetric: e.target.value as AppleWatchMetric | "" }))}
                displayEmpty
              >
                <MenuItem value=""><em>Aucune métrique</em></MenuItem>
                <MenuItem value={AppleWatchMetric.SLEEP}>Sommeil</MenuItem>
                <MenuItem value={AppleWatchMetric.STEPS}>Pas</MenuItem>
                <MenuItem value={AppleWatchMetric.ACTIVE_CALORIES}>Calories actives</MenuItem>
                <MenuItem value={AppleWatchMetric.RESTING_HEART_RATE}>Rythme cardiaque au repos</MenuItem>
                <MenuItem value={AppleWatchMetric.WATER_CONSUMPTION}>Consommation d&apos;eau</MenuItem>
                <MenuItem value={AppleWatchMetric.MINDFULNESS_MINUTES}>Minutes de pleine conscience</MenuItem>
              </Select>
            </FormControl>

            {formData.fieldType === FieldType.NUMBER && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!formData.isHourly}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isHourly: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Format horaire</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Permet de saisir des valeurs sous la forme &quot;6h30&quot; ou &quot;06:30&quot;, converties automatiquement en 6.5 pour les analyses.
                      </Typography>
                    </Box>
                  }
                  sx={{ ml: 0, mt: 1 }}
                />

                {!formData.isHourly && (
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <TextField
                      label="Valeur Min (optionnel)"
                      type="number"
                      fullWidth
                      value={formData.min !== undefined ? formData.min : ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, min: e.target.value === "" ? "" : Number(e.target.value) }))}
                      placeholder="Ex: 0"
                    />
                    <TextField
                      label="Valeur Max (optionnel)"
                      type="number"
                      fullWidth
                      value={formData.max !== undefined ? formData.max : ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, max: e.target.value === "" ? "" : Number(e.target.value) }))}
                      placeholder="Ex: 100"
                    />
                  </Box>
                )}
              </>
            )}

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
