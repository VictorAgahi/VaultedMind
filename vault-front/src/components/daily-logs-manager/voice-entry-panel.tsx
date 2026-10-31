"use client";

import React from "react";
import { Alert, Box, Button, LinearProgress, Typography } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useAuth } from "@/context/auth-context";
import { AiConsentDialog } from "@/components/ai-insights/ai-consent-dialog";
import { AutofillProposal, useVoiceEntry } from "./use-voice-entry";

interface VoiceEntryPanelProps {
  logDate: string;
  notes: string;
  setNotes: (notes: string) => void;
  onProposals: (proposals: AutofillProposal[]) => number;
  /** Ouverture depuis le rappel du soir : le bouton est mis en avant, l'enregistrement attend le toucher. */
  voiceReady?: boolean;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export const VoiceEntryPanel: React.FC<VoiceEntryPanelProps> = ({ logDate, notes, setNotes, onProposals, voiceReady }) => {
  const { user, refreshUser } = useAuth();
  const [consentOpen, setConsentOpen] = React.useState(false);
  const { status, elapsed, error, info, start, stop, fillFromNote, dismissError } = useVoiceEntry({
    logDate,
    notes,
    setNotes,
    onProposals,
  });
  const recordButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (voiceReady) recordButtonRef.current?.focus();
  }, [voiceReady]);

  // Le service IA reçoit l'audio et la note : le consentement avec les notes est demandé avant d'enregistrer, pas après.
  const aiReady = !!user?.aiInsightsEnabled && !!user.consents?.aiConsentAt && user.preferences?.aiIncludeNotes !== false;
  const busy = status === "transcribing" || status === "drafting";
  const recording = status === "recording";

  const handleRecordClick = () => {
    if (recording) {
      stop();
    } else if (!aiReady) {
      setConsentOpen(true);
    } else {
      void start();
    }
  };

  const handleFillClick = () => {
    if (!aiReady) {
      setConsentOpen(true);
    } else {
      fillFromNote();
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1, mb: 2.5 }}>
      <Button
        ref={recordButtonRef}
        type="button"
        variant={recording ? "contained" : "outlined"}
        color={recording ? "error" : "primary"}
        size="large"
        disabled={busy}
        onClick={handleRecordClick}
        startIcon={recording ? <StopRoundedIcon /> : <MicIcon />}
        aria-label={recording ? "Terminer l'enregistrement" : "Raconter ma journée"}
        sx={{
          minHeight: 56,
          borderRadius: 4,
          fontWeight: 700,
          ...(voiceReady && !recording && { borderWidth: 2 }),
        }}
      >
        {recording
          ? `${formatElapsed(elapsed)} · Touchez pour terminer`
          : busy
            ? status === "transcribing"
              ? "Transcription en cours…"
              : "Recherche des faits énoncés…"
            : "Raconter ma journée"}
      </Button>
      {busy && <LinearProgress aria-label="Traitement en cours" sx={{ borderRadius: 2 }} />}
      {recording && (
        <Typography variant="caption" color="text.secondary">
          Parlez normalement, dix minutes au plus. Seuls les faits que vous énoncez seront proposés, jamais votre humeur.
        </Typography>
      )}
      {!recording && !busy && voiceReady && !error && !info && (
        <Typography variant="caption" color="text.secondary">
          Touchez le bouton pour commencer à parler. L&apos;audio est transcrit puis supprimé, il n&apos;est pas conservé.
        </Typography>
      )}
      {!recording && !busy && notes.trim() !== "" && (
        <Button
          type="button"
          size="small"
          color="inherit"
          onClick={handleFillClick}
          startIcon={<AutoAwesomeOutlinedIcon fontSize="small" />}
          sx={{ justifySelf: "start", color: "text.secondary", minHeight: 36 }}
        >
          Remplir depuis ma note
        </Button>
      )}
      {info && !error && <Alert severity="success" icon={false} sx={{ py: 0.5 }}>{info}</Alert>}
      {error && (
        <Alert
          severity={error.kind === "too-long" ? "warning" : "error"}
          onClose={dismissError}
          action={
            error.kind === "consent" ? (
              <Button color="inherit" size="small" onClick={() => setConsentOpen(true)}>
                Activer
              </Button>
            ) : undefined
          }
        >
          {error.message}
        </Alert>
      )}
      <AiConsentDialog
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccepted={() => {
          setConsentOpen(false);
          dismissError();
          void refreshUser();
        }}
      />
    </Box>
  );
};
