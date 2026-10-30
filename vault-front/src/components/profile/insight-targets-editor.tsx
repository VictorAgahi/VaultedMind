"use client";

import React from "react";
import { Box, Button, IconButton, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiService } from "@/services/api.service";
import { FieldType } from "@/types";
import type { CustomField, InsightTarget, TargetDirection } from "@/types";

const MAX_TARGETS = 3;

const isTargetable = (field: CustomField): boolean =>
  field.isActive &&
  (field.fieldType === FieldType.NUMBER ||
    field.fieldType === FieldType.BOOLEAN ||
    (field.fieldType === FieldType.STRING && (field.optionsOrder?.length ?? 0) > 0));

interface InsightTargetsEditorProps {
  initial: InsightTarget[];
  saving: boolean;
  onSave: (targets: InsightTarget[]) => void;
}

// Choix des 1 à 3 champs que l'utilisateur veut comprendre, avec le sens qui est le bon pour chacun.
export const InsightTargetsEditor: React.FC<InsightTargetsEditorProps> = ({ initial, saving, onSave }) => {
  const [targets, setTargets] = React.useState<InsightTarget[]>(initial);
  const [fields, setFields] = React.useState<CustomField[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    apiService
      .get<CustomField[]>("/health/custom-fields", { signal: controller.signal })
      .then((data) => setFields(data.filter(isTargetable)))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const nameOf = (fieldId: string): string => fields.find((field) => field.id === fieldId)?.name ?? "Champ indisponible";
  const available = fields.filter((field) => !targets.some((target) => target.fieldId === field.id));
  const unchanged = JSON.stringify(targets) === JSON.stringify(initial);
  const everyKnown = targets.every((target) => fields.some((field) => field.id === target.fieldId));

  const setDirection = (fieldId: string, direction: TargetDirection | null) => {
    if (!direction) return;
    setTargets((current) => current.map((target) => (target.fieldId === fieldId ? { ...target, direction } : target)));
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Ce que je veux comprendre</Typography>
        <Typography variant="caption" color="text.secondary">
          Choisissez jusqu&apos;à 3 repères (humeur, sommeil, anxiété...) et dites quel sens est le bon pour chacun. Les liens avec le reste de votre journal seront cherchés autour d&apos;eux.
        </Typography>
      </Box>
      {targets.map((target) => (
        <Box key={target.fieldId} sx={{ display: "grid", gap: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{nameOf(target.fieldId)}</Typography>
            <IconButton
              aria-label={`Retirer ${nameOf(target.fieldId)}`}
              size="small"
              onClick={() => setTargets((current) => current.filter((item) => item.fieldId !== target.fieldId))}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={target.direction}
            onChange={(_, direction: TargetDirection | null) => setDirection(target.fieldId, direction)}
          >
            <ToggleButton value="HIGHER_IS_BETTER">Plus haut, c&apos;est mieux</ToggleButton>
            <ToggleButton value="LOWER_IS_BETTER">Plus bas, c&apos;est mieux</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      ))}
      {targets.length < MAX_TARGETS && available.length > 0 && (
        <TextField
          select
          size="small"
          label="Ajouter un repère"
          value=""
          onChange={(e) => setTargets((current) => [...current, { fieldId: e.target.value, direction: "HIGHER_IS_BETTER" }])}
        >
          {available.map((field) => (
            <MenuItem key={field.id} value={field.id}>{field.name}</MenuItem>
          ))}
        </TextField>
      )}
      <Box>
        <Button variant="outlined" disabled={saving || unchanged || !everyKnown} onClick={() => onSave(targets)}>
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
};
