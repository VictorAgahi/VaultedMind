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
  Autocomplete,
  useMediaQuery,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStep(0);
    }
  }, [open]);

  const groupedFields = React.useMemo(() => {
    const groups: Record<string, CustomField[]> = {};
    activeFields.forEach(f => {
      const cat = f.category && f.category.trim() !== "" ? f.category.trim() : "Général";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [activeFields]);

  const categories = Object.keys(groupedFields);
  const steps = ["Résumé", ...categories];

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const renderFieldInput = (field: CustomField) => {
    const value = fieldValuesMap[field.id] || "";

    if (field.fieldType === FieldType.BOOLEAN) {
      return (
        <Box key={field.id} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {field.name}
          </Typography>
          <ToggleButtonGroup
            color="primary"
            value={value}
            exclusive
            onChange={(_, val) => {
              if (val !== null) onFieldValueChange(field.id, val);
            }}
            fullWidth
          >
            <ToggleButton value="true" sx={{ fontWeight: 'bold' }}>Oui</ToggleButton>
            <ToggleButton value="false" sx={{ fontWeight: 'bold' }}>Non</ToggleButton>
          </ToggleButtonGroup>
        </Box>
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

    if (field.fieldType === FieldType.NUMBER && !isHourly) {
      if (field.min !== undefined && field.max !== undefined && field.min !== null && field.max !== null) {
        const numValue = value === "" ? field.min : parseFloat(value);
        return (
          <Box key={field.id} sx={{ mb: 2, px: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {field.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }} color="primary">
                {numValue}
              </Typography>
            </Box>
            <Slider
              value={numValue}
              min={field.min}
              max={field.max}
              step={0.5}
              onChange={(_, val) => onFieldValueChange(field.id, val.toString())}
              valueLabelDisplay="auto"
              sx={{ mt: 1 }}
            />
          </Box>
        );
      }
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
            type={field.fieldType === FieldType.NUMBER && !isHourly ? "number" : "text"}
            fullWidth
            variant="outlined"
          />
        )}
      />
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md" 
      fullScreen={fullScreen}
    >
      <form onSubmit={(e) => {
        e.preventDefault();
        if (activeStep === steps.length - 1) {
          onSubmit(e);
        } else {
          handleNext();
        }
      }}>
        <DialogTitle sx={{ pt: { xs: 'calc(16px + env(safe-area-inset-top))', sm: 2 } }}>
          {isEditing ? "Modifier le journal" : "Nouveau journal"}
        </DialogTitle>
        <DialogContent dividers>
          
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, display: { xs: 'none', sm: 'flex' } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Fallback simple stepper for mobile */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Étape {activeStep + 1} / {steps.length}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {steps[activeStep]}
            </Typography>
          </Box>

          <Box sx={{ minHeight: { xs: '50vh', sm: '40vh' } }}>
            {activeStep === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                  multiline
                  rows={4}
                  variant="outlined"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Comment s'est passée votre journée ?"
                />
              </Box>
            ) : (
              <Box>
                {activeFields.length === 0 ? (
                  <Alert severity="info">
                    Vous n&apos;avez aucun champ personnalisé dans cette catégorie.
                  </Alert>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {groupedFields[categories[activeStep - 1]]?.map(renderFieldInput)}
                  </Box>
                )}
              </Box>
            )}
          </Box>

        </DialogContent>
        <DialogActions sx={{ p: 2, pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 2 }, justifyContent: 'space-between' }}>
          <Button onClick={onClose} color="inherit">Annuler</Button>
          <Box>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Précédent
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            ) : (
              <Button type="submit" variant="contained">
                Suivant
              </Button>
            )}
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};
