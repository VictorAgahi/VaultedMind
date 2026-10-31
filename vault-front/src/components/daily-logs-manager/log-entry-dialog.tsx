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
  InputAdornment,
  IconButton,
  Chip,
  ButtonBase,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { CustomField, FieldType } from "@/types";
import { VoiceEntryPanel } from "./voice-entry-panel";
import type { AutofillProposal } from "./use-voice-entry";

interface StringFieldGridModalProps {
  open: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (value: string) => void;
  fieldName: string;
}

const StringFieldGridModal: React.FC<StringFieldGridModalProps> = ({
  open,
  onClose,
  options,
  onSelect,
  fieldName,
}) => {
  const [search, setSearch] = React.useState("");
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1, pt: { xs: "calc(12px + env(safe-area-inset-top, 0px))", sm: 2 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="span">
          {fieldName}
        </Typography>
        <IconButton onClick={onClose} aria-label="Fermer" sx={{ mr: -1 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Rechercher ou saisir une nouvelle valeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="outlined"
          sx={{ mb: 3, mt: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
            htmlInput: {
              inputMode: "text"
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim() !== "") {
              onSelect(search.trim());
              onClose();
            }
          }}
        />
        {options.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Aucune valeur précédente. Saisissez-en une ci-dessus et appuyez sur Entrée.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 1.5,
              maxHeight: { xs: "none", sm: "40vh" },
              overflowY: "auto",
              p: 0.5
            }}
          >
            {filtered.map((opt, idx) => (
              <ButtonBase
                key={idx}
                onClick={() => {
                  onSelect(opt);
                  onClose();
                }}
                sx={{
                  minHeight: 48,
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: "action.hover",
                  transition: "background-color 160ms cubic-bezier(.2,0,0,1)",
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
                  {opt}
                </Typography>
              </ButtonBase>
            ))}
            {filtered.length === 0 && search.trim() !== "" && (
              <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 2 }}>
                <Typography color="text.secondary" gutterBottom>
                  &quot;{search}&quot; introuvable.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => { onSelect(search.trim()); onClose(); }}>
                  Ajouter &quot;{search}&quot;
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

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
  subFieldValuesMap?: Record<string, Record<string, string>>;
  onSubFieldValueChange?: (fieldId: string, subFieldId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  activeFields: CustomField[];
  historicalValues: Record<string, string[]>;
  error?: string | null;
  /** Valeurs venues d'une proposition de l'assistant et pas encore modifiées à la main. */
  agentSources: Record<string, AgentSource>;
  onClearAgentValue: (fieldId: string) => void;
  onApplyProposals: (proposals: AutofillProposal[]) => number;
  /** Ouverture depuis le rappel du soir : prêt à enregistrer. */
  voiceReady?: boolean;
}

export interface AgentSource {
  /** Valeur proposée, telle qu'affichée dans le formulaire ; une modification à la main retire la proposition. */
  value: string;
  /** Mots exacts de la personne qui énoncent la valeur ; absent pour une valeur déjà enregistrée. */
  quote?: string;
}

// Questions d'écriture en rotation quotidienne, pour ne pas affronter une page blanche.
const WRITING_PROMPTS = [
  "Qu'est-ce qui vous a fait du bien aujourd'hui ?",
  "Qu'est-ce qui vous a pesé, même un peu ?",
  "Une petite victoire du jour ?",
  "Pour quoi êtes-vous reconnaissant·e aujourd'hui ?",
  "Qu'aimeriez-vous faire différemment demain ?",
  "Quelle émotion a dominé votre journée ?",
  "Qui avez-vous eu plaisir à voir ou à entendre ?",
];

export const LogEntryDialog: React.FC<LogEntryDialogProps> = ({
  open,
  onClose,
  logDate,
  setLogDate,
  notes,
  setNotes,
  fieldValuesMap,
  onFieldValueChange,
  subFieldValuesMap,
  onSubFieldValueChange,
  onSubmit,
  submitting,
  activeFields,
  historicalValues,
  error,
  agentSources,
  onClearAgentValue,
  onApplyProposals,
  voiceReady,
}) => {
  const [todayPrompt] = React.useState(() => WRITING_PROMPTS[Math.floor(Date.now() / 86_400_000) % WRITING_PROMPTS.length]);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [activeStep, setActiveStep] = React.useState(0);
  const [stringModalOpenId, setStringModalOpenId] = React.useState<string | null>(null);

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
  // Les champs d'abord (rapides), les notes en dernier (facultatives).
  const steps = [...categories, "Notes et date"];
  const notesStepIndex = steps.length - 1;

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const renderFieldInput = (field: CustomField) => {
    const value = fieldValuesMap[field.id] || "";

    if (field.fieldType === FieldType.BOOLEAN) {
      return (
        <Box key={field.id} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
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
            <ToggleButton value="true" sx={{ minHeight: 48, fontWeight: 700, borderRadius: 3 }}>Oui</ToggleButton>
            <ToggleButton value="false" sx={{ minHeight: 48, fontWeight: 700, borderRadius: 3 }}>Non</ToggleButton>
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
        // Tant que le curseur n'a pas été touché, rien n'est enregistré : on l'affiche comme "non renseigné",
        // centré, pour ne pas suggérer une valeur (ni ancrer l'humeur au minimum).
        const isUnset = value === "";
        const step = field.max - field.min <= 10 ? 1 : 0.5;
        const middle = field.min + Math.round((field.max - field.min) / 2 / step) * step;
        const numValue = isUnset ? middle : parseFloat(value);
        return (
          <Box key={field.id} sx={{ mb: 2, px: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Typography variant="subtitle2">
                {field.name}
              </Typography>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.375rem", fontVariantNumeric: "tabular-nums", color: isUnset ? "text.disabled" : "primary.main" }}>
                {isUnset ? "–" : numValue}
              </Typography>
            </Box>
            <Slider
              value={numValue}
              min={field.min}
              max={field.max}
              step={step}
              marks={field.max - field.min <= 10}
              onChange={(_, val) => onFieldValueChange(field.id, val.toString())}
              valueLabelDisplay="auto"
              aria-label={field.name}
              sx={{ mt: 1, ...(isUnset && { "& .MuiSlider-thumb": { bgcolor: "background.paper", border: 2, borderColor: "divider" }, "& .MuiSlider-track": { display: "none" } }) }}
            />
            {isUnset && (
              <Typography variant="caption" color="text.secondary">Non renseigné. Touchez le curseur pour noter.</Typography>
            )}
            {!isUnset && (
              <Button size="small" color="inherit" onClick={() => onFieldValueChange(field.id, "")} sx={{ minHeight: 32, px: 1, ml: -1, color: "text.secondary" }}>
                Effacer
              </Button>
            )}
          </Box>
        );
      }
    }

    const options = Array.from(new Set([
      ...(field.optionsOrder || []),
      ...(historicalValues[field.id] || [])
    ]));

    const renderMatchingSubFields = (f: CustomField, currentValue: string) => {
      if (!f.subFields || f.subFields.length === 0 || !currentValue) return null;

      const matchingSubFields = f.subFields.filter(
        (sf) => sf.triggerValue.trim().toLowerCase() === currentValue.trim().toLowerCase()
      );

      if (matchingSubFields.length === 0) return null;

      return (
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: 3,
            bgcolor: "action.hover",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {matchingSubFields.map((sf) => {
            const currentSubVal = subFieldValuesMap?.[f.id]?.[sf.id] || "";
            const hasOptions = sf.optionsOrder && sf.optionsOrder.length > 0;

            return (
              <Box key={sf.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                  <SubdirectoryArrowRightIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  <Typography variant="subtitle2">
                    {sf.name}
                  </Typography>
                </Box>

                {hasOptions && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
                    {sf.optionsOrder!.map((choice) => {
                      const isSelected = currentSubVal === choice;
                      return (
                        <Chip
                          key={choice}
                          label={choice}
                          clickable
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          onClick={() => {
                            onSubFieldValueChange?.(f.id, sf.id, isSelected ? "" : choice);
                          }}
                          sx={{
                            minHeight: 36,
                            fontWeight: isSelected ? 700 : 500,
                            bgcolor: isSelected ? "primary.main" : "background.paper",
                            borderColor: isSelected ? "primary.main" : "divider",
                          }}
                        />
                      );
                    })}
                  </Box>
                )}

                <TextField
                  size="small"
                  fullWidth
                  placeholder={sf.placeholder || (hasOptions ? "Ou précisez un autre motif..." : "Précisez votre réponse...")}
                  value={currentSubVal}
                  onChange={(e) => onSubFieldValueChange?.(f.id, sf.id, e.target.value)}
                  variant="outlined"
                  margin="none"
                />
              </Box>
            );
          })}
        </Box>
      );
    };

    if (field.fieldType === FieldType.STRING) {
      return (
        <Box key={field.id} sx={{ mb: 2 }}>
          <TextField
            margin="dense"
            label={field.name}
            type="text"
            fullWidth
            variant="outlined"
            value={value}
            onClick={() => setStringModalOpenId(field.id)}
            slotProps={{
              input: {
                readOnly: true,
                style: { cursor: "pointer" }
              }
            }}
          />
          <StringFieldGridModal
            key={`modal-${field.id}-${stringModalOpenId === field.id}`}
            open={stringModalOpenId === field.id}
            onClose={() => setStringModalOpenId(null)}
            options={options}
            fieldName={field.name}
            onSelect={(val) => onFieldValueChange(field.id, val)}
          />
          {renderMatchingSubFields(field, value)}
        </Box>
      );
    }

    return (
      <Box key={field.id} sx={{ mb: 2 }}>
        <Autocomplete
          freeSolo
          options={options}
          value={value}
          onInputChange={(_, newInputValue) => onFieldValueChange(field.id, newInputValue)}
          renderInput={(params: import("@mui/material").AutocompleteRenderInputParams) => (
            <TextField
              {...params}
              margin="dense"
              label={field.name}
              type={field.fieldType === FieldType.NUMBER && !isHourly ? "number" : "text"}
              fullWidth
              variant="outlined"
              slotProps={{
                ...params.slotProps,
                htmlInput: {
                  // @ts-expect-error MUI v5/v6 compatibility
                  ...(params.slotProps?.htmlInput || params.inputProps),
                  inputMode: field.fieldType === FieldType.NUMBER && !isHourly ? "decimal" : "text"
                }
              }}
            />
          )}
        />
        {renderMatchingSubFields(field, value)}
      </Box>
    );
  };

  // Sous un champ prérempli par l'assistant : ce qui a été retenu, avec les mots exacts, et de quoi l'effacer d'un toucher.
  const renderAgentNote = (field: CustomField) => {
    const source = agentSources[field.id];
    if (!source) return null;
    return (
      <Box sx={{ mt: -1, mb: 2, pl: 1.5, borderLeft: 2, borderColor: "divider", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip label="Proposé" size="small" variant="outlined" color="primary" />
        {source.quote && (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
            « {source.quote} »
          </Typography>
        )}
        <Button size="small" color="inherit" onClick={() => onClearAgentValue(field.id)} sx={{ minHeight: 32, px: 1, color: "text.secondary" }}>
          Effacer
        </Button>
      </Box>
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
      <form style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }} onSubmit={(e) => {
        e.preventDefault();
        if (activeStep === steps.length - 1) {
          onSubmit(e);
        } else {
          handleNext();
        }
      }}>
        <DialogTitle sx={{ pt: { xs: "calc(12px + env(safe-area-inset-top, 0px))", sm: 2 }, pb: 1.5, display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
                Étape {activeStep + 1} sur {steps.length}
              </Typography>
              <Typography variant="h4" component="span" noWrap sx={{ display: "block" }}>
                {steps[activeStep]}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Fermer" sx={{ mr: -1 }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <LinearProgress
            variant="determinate"
            value={((activeStep + 1) / steps.length) * 100}
            aria-label="Progression de la saisie"
            sx={{ display: { xs: "block", sm: "none" }, height: 4, borderRadius: 2, bgcolor: "action.hover" }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {open && (
            <VoiceEntryPanel
              logDate={logDate}
              notes={notes}
              setNotes={setNotes}
              onProposals={onApplyProposals}
              voiceReady={voiceReady}
            />
          )}
          
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, display: { xs: 'none', sm: 'flex' } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: { xs: 0, sm: "40vh" } }}>
            {activeStep === notesStepIndex ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "primary.light" }}>
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>Question du jour</Typography>
                  <Typography variant="body1">{todayPrompt}</Typography>
                </Box>
                <TextField
                  label="Notes (facultatif)"
                  fullWidth
                  multiline
                  minRows={4}
                  variant="outlined"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Quelques mots suffisent."
                  margin="none"
                />
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                  margin="none"
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
                    {groupedFields[categories[activeStep]]?.map((field) => (
                      <Box key={field.id}>
                        {renderFieldInput(field)}
                        {renderAgentNote(field)}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>

        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            pb: { xs: "calc(16px + env(safe-area-inset-bottom, 0px))", sm: 2 },
            gap: 1,
            borderTop: 1,
            borderColor: "divider",
            position: { xs: "sticky", sm: "static" },
            bottom: 0,
            bgcolor: "background.paper",
          }}
        >
          {activeStep === 0 ? (
            <Button onClick={onClose} color="inherit" sx={{ flex: { xs: 1, sm: "none" } }}>Annuler</Button>
          ) : (
            <Button onClick={handleBack} color="inherit" sx={{ flex: { xs: 1, sm: "none" } }}>Précédent</Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ flex: { xs: 2, sm: "none" } }}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          ) : (
            <Button type="submit" variant="contained" size="large" sx={{ flex: { xs: 2, sm: "none" } }}>
              Suivant
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};
