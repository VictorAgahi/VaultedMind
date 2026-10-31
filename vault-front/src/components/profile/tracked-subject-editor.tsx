"use client";

import React from "react";
import { Box, Button, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import type { TrackedSubject, TrackedSubjectKind } from "@/types";

const MAX_TEXT = 40;

const KIND_LABELS: Record<TrackedSubjectKind, string> = {
  SELF: "Moi",
  ANIMAL: "Mon animal",
  OTHER_PERSON: "Une autre personne",
};

interface TrackedSubjectEditorProps {
  initial: TrackedSubject;
  saving: boolean;
  onSave: (subject: TrackedSubject) => void;
}

const normalized = (subject: TrackedSubject): TrackedSubject => {
  if (subject.kind === "SELF") return { kind: "SELF" };
  const name = subject.name?.trim();
  const species = subject.kind === "ANIMAL" ? subject.species?.trim() : undefined;
  return { kind: subject.kind, ...(name && { name }), ...(species && { species }) };
};

// Choix de la personne ou de l'animal dont on suit les journées : adapte les questions, les phrases et l'IA.
export const TrackedSubjectEditor: React.FC<TrackedSubjectEditorProps> = ({ initial, saving, onSave }) => {
  const [subject, setSubject] = React.useState<TrackedSubject>(initial);
  const unchanged = JSON.stringify(normalized(subject)) === JSON.stringify(normalized(initial));

  return (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Qui est suivi ?</Typography>
        <Typography variant="caption" color="text.secondary">
          Si vous notez les journées de votre animal ou d&apos;une autre personne, vos notes restent écrites à la première personne : vous êtes l&apos;observateur. Les questions posées à l&apos;analyse et les phrases s&apos;adaptent à la personne ou à l&apos;animal suivi. Le changement relance l&apos;analyse de vos notes.
        </Typography>
      </Box>
      <RadioGroup
        aria-label="Qui est suivi ?"
        value={subject.kind}
        onChange={(e) => setSubject({ ...subject, kind: e.target.value as TrackedSubjectKind })}
      >
        {(Object.keys(KIND_LABELS) as TrackedSubjectKind[]).map((kind) => (
          <FormControlLabel key={kind} value={kind} control={<Radio size="small" />} label={KIND_LABELS[kind]} />
        ))}
      </RadioGroup>
      {subject.kind !== "SELF" && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            label={subject.kind === "ANIMAL" ? "Nom de l'animal" : "Prénom de la personne"}
            size="small"
            value={subject.name ?? ""}
            onChange={(e) => setSubject({ ...subject, name: e.target.value })}
            slotProps={{ htmlInput: { maxLength: MAX_TEXT } }}
            helperText={subject.kind === "OTHER_PERSON" ? "Remplacé par un alias avant tout envoi à l'analyse." : undefined}
            sx={{ flex: 1, minWidth: 180 }}
          />
          {subject.kind === "ANIMAL" && (
            <TextField
              label="Espèce"
              size="small"
              value={subject.species ?? ""}
              onChange={(e) => setSubject({ ...subject, species: e.target.value })}
              slotProps={{ htmlInput: { maxLength: MAX_TEXT } }}
              helperText="Par exemple : chat, chien."
              sx={{ flex: 1, minWidth: 140 }}
            />
          )}
        </Box>
      )}
      <Box>
        <Button size="small" variant="contained" disabled={saving || unchanged} onClick={() => onSave(normalized(subject))}>
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
};
