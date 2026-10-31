"use client";

import React from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { usePreferencesPatch } from "@/components/settings/use-preferences-patch";

// Identité : le prénom affiché dans l'application. Les autres réglages vivent dans Paramètres.
export const PersonalSettings: React.FC = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = React.useState(user?.firstName ?? "");
  const { saving, status, patch } = usePreferencesPatch();

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); patch({ firstName: firstName.trim() || null }, "Prénom enregistré."); }} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" margin="none" sx={{ flex: 1, minWidth: 0 }} />
        <Button type="submit" variant="outlined" disabled={saving || firstName === (user?.firstName ?? "")} sx={{ minHeight: 56 }}>Enregistrer</Button>
      </Box>
      {status && <Typography variant="caption" color="text.secondary" role="status">{status}</Typography>}
    </Box>
  );
};
