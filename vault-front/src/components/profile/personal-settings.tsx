"use client";

import React from "react";
import { Box, Button, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";

export const PersonalSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = React.useState(user?.firstName ?? "");
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  const patch = async (update: Record<string, string | boolean | null>, done: string) => {
    setSaving(true);
    setStatus(null);
    try {
      await apiService.patch("/users/me/preferences", update);
      await refreshUser();
      setStatus(done);
    } catch (err) {
      setStatus((err as Error).message || "Le réglage n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const insightsV2Allowed = Boolean(user?.consents?.aiConsentAt) && (user?.preferences?.aiIncludeNotes ?? true);

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); patch({ firstName: firstName.trim() || null }, "Prénom enregistré."); }} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" margin="none" sx={{ flex: 1 }} />
        <Button type="submit" variant="outlined" disabled={saving || firstName === (user?.firstName ?? "")} sx={{ minHeight: 56 }}>Enregistrer</Button>
      </Box>
      {user?.aiInsightsEnabled && (
        <FormControlLabel
          control={
            <Switch
              checked={user.preferences?.aiIncludeNotes ?? true}
              disabled={saving}
              onChange={(e) => patch({ aiIncludeNotes: e.target.checked }, e.target.checked ? "Vos notes seront incluses dans l'IA." : "Vos notes ne seront plus envoyées à l'IA.")}
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Inclure mes notes dans l&apos;IA</Typography>
              <Typography variant="caption" color="text.secondary">Désactivé, seules vos valeurs sont envoyées.</Typography>
            </Box>
          }
          sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
        />
      )}
      {user?.aiInsightsEnabled && (
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={user.preferences?.insightsV2Enabled ?? false}
                disabled={saving || (!insightsV2Allowed && !user.preferences?.insightsV2Enabled)}
                onChange={(e) => patch({ insightsV2Enabled: e.target.checked }, e.target.checked ? "Analyse avancée activée." : "Analyse avancée désactivée.")}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Analyse avancée du journal (beta)</Typography>
                <Typography variant="caption" color="text.secondary">Reformule vos notes dictées en texte propre, sans jamais modifier l&apos;original.</Typography>
              </Box>
            }
            sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
          />
          {!insightsV2Allowed && (
            <Typography variant="caption" color="warning.main" role="note" sx={{ display: "block", ml: 6 }}>
              Pour l&apos;activer, acceptez d&apos;abord l&apos;envoi de vos données à l&apos;IA en incluant vos notes.
            </Typography>
          )}
        </Box>
      )}
      {status && <Typography variant="caption" color="text.secondary" role="status">{status}</Typography>}
    </Box>
  );
};
