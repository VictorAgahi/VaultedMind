"use client";

import React from "react";
import { Autocomplete, Box, Button, IconButton, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiService } from "@/services/api.service";
import { FieldType } from "@/types";
import type { CustomField, InsightTarget, TargetDirection } from "@/types";

const MAX_TARGETS = 6;
const SCALE_VALUE = "";

const isOrderedString = (field: CustomField): boolean =>
  field.fieldType === FieldType.STRING && (field.optionsOrder?.length ?? 0) > 0;

const isTargetable = (field: CustomField): boolean =>
  field.isActive &&
  (field.fieldType === FieldType.NUMBER || field.fieldType === FieldType.BOOLEAN || field.fieldType === FieldType.STRING);

const identityOf = (target: InsightTarget): string => `${target.fieldId}=${target.value ?? ""}`;

interface InsightTargetsEditorProps {
  initial: InsightTarget[];
  saving: boolean;
  onSave: (targets: InsightTarget[]) => void;
}

interface DirectionToggleProps {
  target: InsightTarget;
  onChange: (direction: TargetDirection) => void;
}

const DirectionToggle: React.FC<DirectionToggleProps> = ({ target, onChange }) => {
  const isValue = target.value !== undefined;
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      orientation="vertical"
      size="small"
      color="primary"
      value={target.direction}
      onChange={(_, direction: TargetDirection | null) => direction && onChange(direction)}
    >
      <ToggleButton value="HIGHER_IS_BETTER">{isValue ? "Plus fréquent, c'est mieux" : "Plus haut, c'est mieux"}</ToggleButton>
      <ToggleButton value="LOWER_IS_BETTER">{isValue ? "Plus rare, c'est mieux" : "Plus bas, c'est mieux"}</ToggleButton>
      <ToggleButton value="NEUTRAL">Juste comprendre ce qui le fait varier</ToggleButton>
    </ToggleButtonGroup>
  );
};

interface ValuePickerProps {
  field: CustomField;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// Champ ordonné : toute l'échelle ou une valeur précise. Champ libre : une valeur obligatoire,
// proposée parmi celles déjà notées.
const ValuePicker: React.FC<ValuePickerProps> = ({ field, value, onChange }) => {
  const [logged, setLogged] = React.useState<string[]>([]);
  const ordered = isOrderedString(field);

  React.useEffect(() => {
    if (ordered) return;
    const controller = new AbortController();
    apiService
      .get<{ values: string[] }>(`/insights/patterns/field-values?fieldId=${field.id}`, { signal: controller.signal })
      .then((data) => setLogged(data.values))
      .catch(() => undefined);
    return () => controller.abort();
  }, [field.id, ordered]);

  if (ordered) {
    return (
      <TextField
        select
        size="small"
        label="Ce qui est suivi"
        value={value ?? SCALE_VALUE}
        onChange={(e) => onChange(e.target.value === SCALE_VALUE ? undefined : e.target.value)}
      >
        <MenuItem value={SCALE_VALUE}>Toute l&apos;échelle</MenuItem>
        {(field.optionsOrder ?? []).map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <Autocomplete
      freeSolo
      size="small"
      options={logged}
      value={value ?? ""}
      onInputChange={(_, text) => onChange(text === "" ? "" : text)}
      renderInput={(params) => <TextField {...params} label="Valeur suivie" helperText="La valeur dont on cherche ce qui la fait varier." />}
    />
  );
};

// Choix des 1 à 6 repères que l'utilisateur veut comprendre : un champ, ou une valeur d'un champ texte,
// avec le sens qui est le bon (ou aucun).
export const InsightTargetsEditor: React.FC<InsightTargetsEditorProps> = ({ initial, saving, onSave }) => {
  const [targets, setTargets] = React.useState<InsightTarget[]>(initial);
  const [allFields, setAllFields] = React.useState<CustomField[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    apiService
      .get<CustomField[]>("/health/custom-fields", { signal: controller.signal })
      .then((data) => setAllFields(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const fields = allFields.filter(isTargetable);
  const fieldOf = (fieldId: string): CustomField | undefined => allFields.find((field) => field.id === fieldId);
  const nameOf = (fieldId: string): string => fieldOf(fieldId)?.name ?? "Champ indisponible";
  const isNoLongerActive = (fieldId: string): boolean =>
    allFields.length > 0 && !fields.some((field) => field.id === fieldId);
  // Un champ texte peut revenir avec une autre valeur ; un nombre ou un oui/non une seule fois.
  const available = fields.filter(
    (field) => field.fieldType === FieldType.STRING || !targets.some((target) => target.fieldId === field.id),
  );
  const unchanged = JSON.stringify(targets) === JSON.stringify(initial);
  const everyKnown = targets.every((target) => allFields.some((field) => field.id === target.fieldId));
  const needsValue = (target: InsightTarget): boolean => {
    const field = fieldOf(target.fieldId);
    return !!field && field.fieldType === FieldType.STRING && !isOrderedString(field) && !(target.value ?? "").trim();
  };
  const hasMissingValue = targets.some(needsValue);
  const hasDuplicate = new Set(targets.map(identityOf)).size !== targets.length;

  const update = (index: number, change: Partial<InsightTarget>) =>
    setTargets((current) => current.map((target, position) => (position === index ? { ...target, ...change } : target)));

  const setValue = (index: number, value: string | undefined) =>
    setTargets((current) =>
      current.map((target, position) => {
        if (position !== index) return target;
        const next: InsightTarget = { ...target };
        if (value === undefined) delete next.value;
        else next.value = value;
        return next;
      }),
    );

  const addField = (fieldId: string) => {
    const field = fieldOf(fieldId);
    const needsPick = !!field && field.fieldType === FieldType.STRING && !isOrderedString(field);
    setTargets((current) => [
      ...current,
      needsPick ? { fieldId, direction: "NEUTRAL", value: "" } : { fieldId, direction: "HIGHER_IS_BETTER" },
    ]);
  };

  return (
    <Box id="insight-targets" sx={{ display: "grid", gap: 1.5, mt: 1.5, scrollMarginTop: 80 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Ce que je veux comprendre</Typography>
        <Typography variant="caption" color="text.secondary">
          Choisissez jusqu&apos;à {MAX_TARGETS} repères (humeur, sommeil, anxiété, une valeur précise d&apos;un champ texte...) et dites quel sens est le bon pour chacun, ou si vous voulez juste comprendre ce qui le fait varier. Les liens avec le reste de votre journal seront cherchés autour d&apos;eux.
        </Typography>
      </Box>
      {targets.map((target, index) => {
        const field = fieldOf(target.fieldId);
        const title = target.value ? `${nameOf(target.fieldId)} : ${target.value}` : nameOf(target.fieldId);
        return (
          <Box key={`${target.fieldId}-${index}`} sx={{ display: "grid", gap: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
              <IconButton
                aria-label={`Retirer ${title}`}
                size="small"
                onClick={() => setTargets((current) => current.filter((_, position) => position !== index))}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            {isNoLongerActive(target.fieldId) && (
              <Typography variant="caption" color="text.secondary" role="status">
                Ce champ n&apos;est plus actif : il est laissé de côté dans l&apos;analyse. Vous pouvez le retirer ou le réactiver dans vos champs.
              </Typography>
            )}
            {field && field.fieldType === FieldType.STRING && (
              <ValuePicker field={field} value={target.value} onChange={(value) => setValue(index, value)} />
            )}
            <DirectionToggle target={target} onChange={(direction) => update(index, { direction })} />
          </Box>
        );
      })}
      {hasMissingValue && (
        <Typography variant="caption" color="text.secondary" role="status">
          Choisissez une valeur pour chaque champ texte libre.
        </Typography>
      )}
      {hasDuplicate && (
        <Typography variant="caption" color="text.secondary" role="status">
          Le même repère ne peut pas être choisi deux fois.
        </Typography>
      )}
      {targets.length < MAX_TARGETS && available.length > 0 && (
        <TextField
          select
          size="small"
          label="Ajouter un repère"
          value=""
          onChange={(e) => addField(e.target.value)}
        >
          {available.map((field) => (
            <MenuItem key={field.id} value={field.id}>{field.name}</MenuItem>
          ))}
        </TextField>
      )}
      <Box>
        <Button
          variant="outlined"
          disabled={saving || unchanged || !everyKnown || hasMissingValue || hasDuplicate}
          onClick={() => onSave(targets)}
        >
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
};
