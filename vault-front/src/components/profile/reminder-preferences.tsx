"use client";

import React from "react";
import { Box, Button, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";

const SLOTS = Array.from({ length: 4 * 7 }, (_, i) => {
  const minutes = 17 * 60 + i * 15; // de 17 h à 23 h 45
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

interface ReminderPreferencesProps {
  onUnsubscribed: () => void;
}

// Un seul rappel par jour, à l'heure choisie, dans le fuseau de l'appareil.
export const ReminderPreferences: React.FC<ReminderPreferencesProps> = ({ onUnsubscribed }) => {
  const { user, refreshUser } = useAuth();
  const prefs = user?.preferences;
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const save = async (update: { reminderEnabled?: boolean; reminderTime?: string }) => {
    setSaving(true);
    setMessage(null);
    try {
      await apiService.patch("/users/me/preferences", {
        ...update,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await refreshUser();
      setMessage("Rappel enregistré.");
    } catch (err) {
      setMessage((err as Error).message || "Le réglage n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const unsubscribeDevice = async () => {
    setSaving(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await apiService.delete("/notifications/subscribe", { body: JSON.stringify(subscription ? { endpoint: subscription.endpoint } : {}) });
      await subscription?.unsubscribe();
      onUnsubscribed();
    } catch (err) {
      setMessage((err as Error).message || "La désactivation a échoué.");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) return null;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <FormControlLabel
        control={
          <Switch
            checked={prefs.reminderEnabled}
            disabled={saving}
            onChange={(e) => save({ reminderEnabled: e.target.checked })}
          />
        }
        label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Rappel quotidien</Typography>}
      />
      {prefs.reminderEnabled && (
        <TextField
          select
          label="Heure du rappel"
          value={prefs.reminderTime}
          disabled={saving}
          onChange={(e) => save({ reminderTime: e.target.value })}
          helperText={`Fuseau : ${prefs.timezone}. Pas de rappel si la journée est déjà notée.`}
          margin="none"
        >
          {SLOTS.map((slot) => (
            <MenuItem key={slot} value={slot}>{slot.replace(":", " h ")}</MenuItem>
          ))}
        </TextField>
      )}
      {message && <Typography variant="caption" color="text.secondary" role="status">{message}</Typography>}
      <Button color="inherit" onClick={unsubscribeDevice} disabled={saving} sx={{ justifySelf: "start" }}>
        Ne plus recevoir de notifications sur cet appareil
      </Button>
    </Box>
  );
};
