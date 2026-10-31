"use client";

import React from "react";
import Link from "next/link";
import { Alert, Box, Button, CircularProgress, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SaveIcon from "@mui/icons-material/Save";
import { useAuth } from "@/context/auth-context";
import { apiService } from "@/services/api.service";
import { AiConsentDialog } from "@/components/ai-insights/ai-consent-dialog";
import { SettingsBlock } from "./settings-block";
import { usePreferencesPatch } from "./use-preferences-patch";

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Consentement : activer (dialogue explicite) ou désactiver l'assistant.
const AiConsentSetting: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const enabled = !!user?.aiInsightsEnabled;
  const consentAt = user?.consents?.aiConsentAt;

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiService.post("/health/ai-insights/disable");
      window.dispatchEvent(new CustomEvent("ai-insights-status-changed", { detail: { enabled: false } }));
      await refreshUser();
    } catch (err) {
      setError((err as Error).message || "La désactivation a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsBlock
      title="Consentement"
      description={
        enabled
          ? `Activé${consentAt ? ` depuis le ${formatDate(consentAt)}` : ""}. Vos données ne sont envoyées à l'IA que lorsque vous l'utilisez.`
          : "L'assistant est désactivé : rien n'est envoyé à l'IA."
      }
    >
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {enabled ? (
        <Button variant="outlined" color="inherit" fullWidth disabled={busy} onClick={disable}>
          {busy ? "Désactivation…" : "Désactiver l'assistant IA"}
        </Button>
      ) : (
        <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
          Activer l&apos;assistant IA
        </Button>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Ce qui est envoyé et à qui : <Link href="/privacy" style={{ color: "inherit" }}>politique de confidentialité</Link>.
      </Typography>
      <AiConsentDialog
        open={open}
        onClose={() => setOpen(false)}
        onAccepted={() => {
          setOpen(false);
          void refreshUser();
        }}
      />
    </SettingsBlock>
  );
};

const AiNotesSetting: React.FC = () => {
  const { user } = useAuth();
  const { saving, status, patch } = usePreferencesPatch();
  if (!user?.aiInsightsEnabled) return null;

  return (
    <SettingsBlock>
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
        sx={{ alignItems: "flex-start", mx: 0, gap: 1, "& .MuiSwitch-root": { mt: -0.5, flex: "none" } }}
      />
      {status && <Typography variant="caption" color="text.secondary" role="status" sx={{ display: "block", mt: 1 }}>{status}</Typography>}
    </SettingsBlock>
  );
};

// Contexte par défaut donné à l'assistant (mêmes appels qu'avant le déplacement depuis le Profil).
const AiContextSetting: React.FC = () => {
  const [context, setContext] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [optimizing, setOptimizing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    apiService
      .get<{ context: string }>("/health/ai-insights/context", { signal: controller.signal })
      .then((res) => setContext(res.context || ""))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!saved) return;
    const timeoutId = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timeoutId);
  }, [saved]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiService.post("/health/ai-insights/context", { context });
      setSaved(true);
    } catch {
      setError("Échec de l'enregistrement du contexte.");
    } finally {
      setSaving(false);
    }
  };

  const optimize = async () => {
    if (!context.trim()) {
      setError("Veuillez d'abord saisir un contexte de base à optimiser.");
      return;
    }
    setOptimizing(true);
    setError(null);
    try {
      const res = await apiService.post<{ optimized: string }, { context: string }>("/health/ai-insights/context/optimize", { context });
      setContext(res.optimized);
    } catch {
      setError("Échec de l'optimisation par l'IA.");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <SettingsBlock
      title="Ce que l'IA sait de moi"
      description="Un contexte par défaut, par exemple « Je suis étudiant » ou « Je suis très stressé en ce moment ». Il sert à personnaliser les réponses et vos bilans."
    >
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <TextField
        fullWidth
        multiline
        minRows={4}
        disabled={loading}
        placeholder="Ex. : J'aimerais que tu sois direct et que tu te concentres sur la productivité..."
        value={context}
        onChange={(e) => setContext(e.target.value)}
        slotProps={{ htmlInput: { "aria-label": "Contexte pour l'assistant IA" } }}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={optimize}
          disabled={optimizing || !context.trim()}
          startIcon={optimizing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
        >
          {optimizing ? "Optimisation..." : "Optimiser via l'IA"}
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={save}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        >
          {saved ? "Contexte enregistré" : "Enregistrer le contexte"}
        </Button>
      </Stack>
    </SettingsBlock>
  );
};

export const AiAssistantSettings: React.FC = () => {
  const { user } = useAuth();
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <AiConsentSetting />
      <AiNotesSetting />
      {user?.aiInsightsEnabled && <AiContextSetting />}
    </Box>
  );
};
