"use client";

import React from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { disableAppLock, enableAppLock, isValidPin, readAppLock, updateLockTimeout } from "./app-lock-store";

const TIMEOUTS = [
  { value: 1, label: "Après 1 minute" },
  { value: 5, label: "Après 5 minutes" },
  { value: 15, label: "Après 15 minutes" },
];

export const AppLockSettings: React.FC = () => {
  const [enabled, setEnabled] = React.useState(false);
  const [timeout, setTimeoutMinutes] = React.useState(5);
  const [editing, setEditing] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const config = readAppLock();
      setEnabled(!!config);
      if (config) setTimeoutMinutes(config.timeoutMinutes);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const save = async () => {
    if (!isValidPin(pin)) {
      setError("Le code doit contenir 4 à 6 chiffres.");
      return;
    }
    if (pin !== confirm) {
      setError("Les deux codes ne correspondent pas.");
      return;
    }
    await enableAppLock(pin, timeout);
    setEnabled(true);
    setEditing(false);
    setPin("");
    setConfirm("");
    setError(null);
  };

  const pinInput = { inputMode: "numeric" as const, pattern: "[0-9]*", maxLength: 6, autoComplete: "off" };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Protège l&apos;accès à votre carnet sur cet appareil, utile si votre téléphone est partagé. Le code reste sur l&apos;appareil.
      </Typography>
      {enabled && !editing ? (
        <>
          <TextField
            select
            label="Redemander le code"
            value={timeout}
            onChange={(e) => {
              const value = Number(e.target.value);
              setTimeoutMinutes(value);
              updateLockTimeout(value);
            }}
            margin="none"
          >
            {TIMEOUTS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => setEditing(true)}>Changer le code</Button>
            <Button color="error" onClick={() => { disableAppLock(); setEnabled(false); }}>Désactiver</Button>
          </Box>
        </>
      ) : editing || !enabled ? (
        editing ? (
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <TextField label="Nouveau code (4 à 6 chiffres)" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} slotProps={{ htmlInput: pinInput }} margin="none" />
            <TextField label="Confirmez le code" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} slotProps={{ htmlInput: pinInput }} margin="none" />
            <TextField select label="Redemander le code" value={timeout} onChange={(e) => setTimeoutMinutes(Number(e.target.value))} margin="none">
              {TIMEOUTS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            {error && <Typography variant="body2" color="error.main" role="alert">{error}</Typography>}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" onClick={() => { setEditing(false); setError(null); }}>Annuler</Button>
              <Button variant="contained" onClick={save}>Activer le verrouillage</Button>
            </Box>
          </Box>
        ) : (
          <Button variant="outlined" onClick={() => setEditing(true)} sx={{ justifySelf: "start" }}>Définir un code</Button>
        )
      ) : null}
    </Box>
  );
};
