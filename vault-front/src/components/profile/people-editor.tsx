"use client";

import React from "react";
import { Autocomplete, Box, Button, Chip, IconButton, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Person } from "@/types";

const MAX_PEOPLE = 15;
const MAX_VARIANTS = 5;

const newId = (): string => Math.random().toString(36).slice(2, 10).padEnd(8, "0");

interface PeopleEditorProps {
  initial: Person[];
  saving: boolean;
  onSave: (people: Person[]) => void;
}

// Éditeur compact de l'entourage : les noms listés sont remplacés par leur alias avant tout envoi.
export const PeopleEditor: React.FC<PeopleEditorProps> = ({ initial, saving, onSave }) => {
  const [people, setPeople] = React.useState<Person[]>(initial);

  const update = (id: string, change: Partial<Person>) =>
    setPeople((current) => current.map((person) => (person.id === id ? { ...person, ...change } : person)));

  const complete = people.every((person) => person.alias.trim() && person.variants.length > 0);
  const unchanged = JSON.stringify(people) === JSON.stringify(initial);

  return (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Mon entourage</Typography>
        <Typography variant="caption" color="text.secondary">
          Indiquez un alias (par exemple « Compagne ») et les prénoms ou orthographes que vous dictez. Ces noms sont remplacés par l&apos;alias avant que quoi que ce soit ne quitte le serveur.
        </Typography>
      </Box>
      {people.map((person) => (
        <Box key={person.id} sx={{ display: "grid", gap: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Alias"
              size="small"
              value={person.alias}
              onChange={(e) => update(person.id, { alias: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 30 } }}
              sx={{ flex: 1 }}
            />
            <IconButton aria-label={`Retirer ${person.alias || "cette personne"}`} onClick={() => setPeople((current) => current.filter((p) => p.id !== person.id))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={[]}
            value={person.variants}
            onChange={(_, value) => update(person.id, { variants: value.map((v) => v.trim().slice(0, 40)).filter(Boolean).slice(0, MAX_VARIANTS) })}
            renderValue={(value, getItemProps) =>
              value.map((variant, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip key={key} size="small" label={variant} {...itemProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Prénoms et variantes" helperText="Validez chaque nom avec Entrée (5 maximum)." />}
          />
        </Box>
      ))}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          disabled={people.length >= MAX_PEOPLE}
          onClick={() => setPeople((current) => [...current, { id: newId(), alias: "", variants: [] }])}
        >
          Ajouter une personne
        </Button>
        <Button size="small" variant="contained" disabled={saving || unchanged || !complete} onClick={() => onSave(people)}>
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
};
