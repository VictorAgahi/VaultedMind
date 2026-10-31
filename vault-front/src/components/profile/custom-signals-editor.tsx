"use client";

import React from "react";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { CustomSignal } from "@/types";

const MAX_SIGNALS = 10;
const LABEL_MAX = 40;
const QUESTION_MIN = 5;
const QUESTION_MAX = 200;
const FORBIDDEN = /[<>{}[\]`]/;

const newId = (): string => Math.random().toString(36).slice(2, 10).padEnd(8, "0");

interface CustomSignalsEditorProps {
  initial: CustomSignal[];
  saving: boolean;
  onSave: (signals: CustomSignal[]) => void;
}

const problemOf = (signal: CustomSignal): string | null => {
  const label = signal.label.trim();
  const question = signal.question.trim();
  if (!label) return "Donnez un nom court au signal.";
  if (question.length < QUESTION_MIN) return "La question est trop courte.";
  if (FORBIDDEN.test(label) || FORBIDDEN.test(question)) return "Les caractères < > { } [ ] ` ne sont pas autorisés.";
  return null;
};

// Questions oui/non écrites par l'utilisateur, posées à l'analyse sur chaque note.
export const CustomSignalsEditor: React.FC<CustomSignalsEditorProps> = ({ initial, saving, onSave }) => {
  const [signals, setSignals] = React.useState<CustomSignal[]>(initial);

  const update = (id: string, change: Partial<CustomSignal>) =>
    setSignals((current) => current.map((signal) => (signal.id === id ? { ...signal, ...change } : signal)));

  const labels = signals.map((signal) => signal.label.trim().toLowerCase());
  const duplicated = new Set(labels).size !== labels.length;
  const complete = signals.every((signal) => problemOf(signal) === null) && !duplicated;
  const unchanged = JSON.stringify(signals) === JSON.stringify(initial);

  return (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Mes signaux personnalisés</Typography>
        <Typography variant="caption" color="text.secondary">
          Ajoutez jusqu&apos;à {MAX_SIGNALS} questions auxquelles on répond par oui ou non d&apos;après la note du jour. Formulez une question positive et précise, par exemple « Le chat a-t-il uriné hors de sa litière ? » plutôt que « Le chat va-t-il mal ? ». Le nom court s&apos;affiche sur les pastilles et dans les phrases.
        </Typography>
      </Box>
      {signals.map((signal) => {
        const problem = problemOf(signal);
        return (
          <Box key={signal.id} sx={{ display: "grid", gap: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Nom court"
                size="small"
                value={signal.label}
                onChange={(e) => update(signal.id, { label: e.target.value })}
                slotProps={{ htmlInput: { maxLength: LABEL_MAX } }}
                sx={{ flex: 1 }}
              />
              <IconButton aria-label={`Retirer ${signal.label || "ce signal"}`} onClick={() => setSignals((current) => current.filter((item) => item.id !== signal.id))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              label="Question (oui ou non)"
              size="small"
              multiline
              minRows={2}
              value={signal.question}
              onChange={(e) => update(signal.id, { question: e.target.value })}
              slotProps={{ htmlInput: { maxLength: QUESTION_MAX } }}
              error={Boolean(signal.label || signal.question) && problem !== null}
              helperText={signal.label || signal.question ? problem ?? `${signal.question.length}/${QUESTION_MAX}` : undefined}
            />
          </Box>
        );
      })}
      {duplicated && (
        <Typography variant="caption" color="error" role="alert">Deux signaux ne peuvent pas avoir le même nom.</Typography>
      )}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={signals.length >= MAX_SIGNALS}
          onClick={() => setSignals((current) => [...current, { id: newId(), label: "", question: "", kind: "yes_no" }])}
        >
          Ajouter un signal
        </Button>
        <Button size="small" variant="contained" disabled={saving || unchanged || !complete} onClick={() => onSave(signals.map((signal) => ({ ...signal, label: signal.label.trim(), question: signal.question.trim() })))}>
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
};
