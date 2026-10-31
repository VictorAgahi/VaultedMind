"use client";

import React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { apiService } from "@/services/api.service";
import type { AppError } from "@/types";

export const HEALTH_SHORTCUT_NAME = "VaultedMind Sync";

interface SyncTokenResponse {
  token: string;
  expiresAt: string;
}

export function buildShortcutUrl(token: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(HEALTH_SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(token)}`;
}

const subscribeNever = (): (() => void) => () => undefined;

function detectIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator;
  // iPadOS se présente comme un Mac, mais avec un écran tactile.
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

interface HealthSyncButtonProps {
  /** Appelé juste avant de quitter l'application : sert à garder la saisie en cours. */
  onBeforeLaunch?: () => void;
}

export const HealthSyncButton: React.FC<HealthSyncButtonProps> = ({ onBeforeLaunch }) => {
  const isIos = React.useSyncExternalStore(subscribeNever, detectIos, () => false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isIos) return null;

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await apiService.post<SyncTokenResponse, Record<string, never>>("/integrations/health/sync-token", {});
      onBeforeLaunch?.();
      window.location.href = buildShortcutUrl(token);
    } catch (err) {
      setError((err as AppError).message || "Impossible de préparer la synchronisation Santé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<FavoriteBorderIcon />}
        onClick={handleClick}
        disabled={busy}
        sx={{ borderRadius: 3, py: 1.2 }}
      >
        Récupérer mes données Santé
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        Ouvre le raccourci VaultedMind Sync, puis vous revenez ici. Voir « Intégrations » pour l&apos;installer.
      </Typography>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
};
