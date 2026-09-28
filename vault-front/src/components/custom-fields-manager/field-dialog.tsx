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
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { FieldType, AppleWatchMetric, SubFieldDefinition } from "@/types";

interface OptionItem {
  id: string;
  value: string;
}

export interface FieldFormData {
  name: string;
  fieldType: FieldType;
  optionsOrder: OptionItem[];
  subFields?: SubFieldDefinition[];
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
    const oldOption = formData.optionsOrder.find((o) => o.id === id);
    const oldVal = oldOption?.value;

    setFormData((prev) => {
      const updatedOptions = prev.optionsOrder.map((opt) => (opt.id === id ? { ...opt, value: val } : opt));
      let updatedSubFields = prev.subFields || [];
      if (oldVal && oldVal !== val && oldVal.trim() !== "") {
        updatedSubFields = updatedSubFields.map((sf) =>
          sf.triggerValue === oldVal ? { ...sf, triggerValue: val } : sf
        );
      }
      return {
        ...prev,
        optionsOrder: updatedOptions,
        subFields: updatedSubFields,
      };
    });
  };

  const handleRemoveOption = (id: string) => {
    const optToRemove = formData.optionsOrder.find((o) => o.id === id);
    const optVal = optToRemove?.value;

    setFormData((prev) => ({
      ...prev,
      optionsOrder: prev.optionsOrder.filter((opt) => opt.id !== id),
      subFields: (prev.subFields || []).filter((sf) => sf.triggerValue !== optVal),
    }));
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const newOptions = [...formData.optionsOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];

    setFormData((prev) => ({ ...prev, optionsOrder: newOptions }));
  };

  const handleAddSubField = (triggerValue: string) => {
    const newSubField: SubFieldDefinition = {
      id: crypto.randomUUID(),
      triggerValue,
      name: "Pourquoi ?",
      fieldType: FieldType.STRING,
      optionsOrder: ["Insomnie", "Stress", "Autre"],
      placeholder: "Précisez...",
      required: false,
    };
    setFormData((prev) => ({
      ...prev,
      subFields: [...(prev.subFields || []), newSubField],
    }));
  };

  const handleRemoveSubField = (subFieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      subFields: (prev.subFields || []).filter((sf) => sf.id !== subFieldId),
    }));
  };

  const handleUpdateSubFieldName = (subFieldId: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      subFields: (prev.subFields || []).map((sf) => (sf.id === subFieldId ? { ...sf, name } : sf)),
    }));
  };

  const handleAddSubOption = (subFieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      subFields: (prev.subFields || []).map((sf) => {
        if (sf.id !== subFieldId) return sf;
        const opts = sf.optionsOrder || [];
        return { ...sf, optionsOrder: [...opts, `Choix ${opts.length + 1}`] };
      }),
    }));
  };

  const handleUpdateSubOption = (subFieldId: string, optIndex: number, val: string) => {
    setFormData((prev) => ({
      ...prev,
      subFields: (prev.subFields || []).map((sf) => {
        if (sf.id !== subFieldId) return sf;
        const opts = [...(sf.optionsOrder || [])];
        opts[optIndex] = val;
        return { ...sf, optionsOrder: opts };
      }),
    }));
  };

  const handleRemoveSubOption = (subFieldId: string, optIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      subFields: (prev.subFields || []).map((sf) => {
        if (sf.id !== subFieldId) return sf;
        const opts = (sf.optionsOrder || []).filter((_, idx) => idx !== optIndex);
        return { ...sf, optionsOrder: opts };
      }),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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
              <InputLabel id="apple-watch-label" shrink>Associer à une métrique Apple Watch (optionnel)</InputLabel>
              <Select
                labelId="apple-watch-label"
                id="apple-watch-select"
                value={formData.appleWatchMetric || ""}
                label="Associer à une métrique Apple Watch (optionnel)"
                onChange={(e) => setFormData((prev) => ({ ...prev, appleWatchMetric: e.target.value as AppleWatchMetric | "" }))}
                displayEmpty
                notched
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Options de réponse (ordre d&apos;affichage)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vous pouvez ajouter des sous-champs conditionnels (ex: &quot;Pourquoi ?&quot;)
                  </Typography>
                </Box>

                {formData.optionsOrder.map((opt, idx) => {
                  const optionSubFields = (formData.subFields || []).filter(
                    (sf) => sf.triggerValue === opt.value && opt.value.trim() !== ""
                  );

                  return (
                    <Box
                      key={opt.id}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid rgba(0,0,0,0.08)",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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
                          placeholder={`Option ${idx + 1} (ex: Mauvais, Moyen, Bien)`}
                          sx={{ bgcolor: "background.paper" }}
                        />
                        <IconButton color="error" onClick={() => handleRemoveOption(opt.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      {/* Display existing sub-fields for this option */}
                      {optionSubFields.map((subField) => (
                        <Box
                          key={subField.id}
                          sx={{
                            mt: 1.5,
                            ml: { xs: 1, sm: 4 },
                            p: 2,
                            borderRadius: 2,
                            border: "1.5px dashed rgba(216, 24, 50, 0.4)",
                            bgcolor: "rgba(216, 24, 50, 0.03)",
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <SubdirectoryArrowRightIcon sx={{ color: "primary.main", fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#142949" }}>
                                Sous-champ conditionnel (si « {opt.value} »)
                              </Typography>
                            </Box>
                            <Tooltip title="Supprimer ce sous-champ">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveSubField(subField.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          <TextField
                            size="small"
                            fullWidth
                            label="Question / Intitulé du sous-champ"
                            value={subField.name}
                            onChange={(e) => handleUpdateSubFieldName(subField.id, e.target.value)}
                            placeholder="Ex: Pourquoi ?"
                            sx={{ mb: 1.5, bgcolor: "background.paper" }}
                          />

                          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                            Choix proposés pour ce sous-champ :
                          </Typography>

                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {(subField.optionsOrder || []).map((subOpt, subOptIdx) => (
                              <Box key={subOptIdx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  value={subOpt}
                                  onChange={(e) => handleUpdateSubOption(subField.id, subOptIdx, e.target.value)}
                                  placeholder={`Choix ${subOptIdx + 1} (ex: Insomnie, Stress, Bruit...)`}
                                  sx={{ bgcolor: "background.paper" }}
                                />
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveSubOption(subField.id, subOptIdx)}
                                  disabled={(subField.optionsOrder || []).length <= 1}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ))}

                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AddIcon />}
                              onClick={() => handleAddSubOption(subField.id)}
                              sx={{ alignSelf: "flex-start", mt: 0.5, color: "primary.main" }}
                            >
                              Ajouter un choix
                            </Button>
                          </Box>
                        </Box>
                      ))}

                      {/* Button to add sub-field for this option */}
                      <Box sx={{ mt: 1, ml: { xs: 1, sm: 4 } }}>
                        <Tooltip
                          title={
                            opt.value.trim() === ""
                              ? "Saisissez d'abord un nom pour cette option ci-dessus"
                              : ""
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddCircleOutlineIcon />}
                              onClick={() => handleAddSubField(opt.value)}
                              disabled={opt.value.trim() === ""}
                              sx={{
                                fontSize: "0.75rem",
                                textTransform: "none",
                                borderColor: "rgba(216, 24, 50, 0.4)",
                                color: "#d81832",
                                "&:hover": {
                                  borderColor: "#d81832",
                                  bgcolor: "rgba(216, 24, 50, 0.05)",
                                },
                              }}
                            >
                              {optionSubFields.length > 0
                                ? "+ Ajouter un autre sous-champ"
                                : "+ Ajouter un sous-champ (ex: Pourquoi ?)"}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}

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
