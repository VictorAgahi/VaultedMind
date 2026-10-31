"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { apiService } from "@/services/api.service";

interface AiConsentDialogProps {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

const POINTS = [
  {
    title: "Ce qui est envoyé",
    text: "Vos valeurs des 30 à 60 derniers jours, le nom de vos champs et, si vous le choisissez ci-dessous, vos notes. Jamais votre e-mail ni votre nom.",
  },
  {
    title: "À qui",
    text: "À OpenAI, notre sous-traitant pour l'IA, aux États-Unis. Les données transitent chiffrées et ne servent qu'à générer votre réponse.",
  },
  {
    title: "Raconter ma journée",
    text: "Si vous parlez à l'application, l'audio est envoyé à OpenAI pour être transcrit ; nous ne le conservons pas. Le texte est ensuite lu pour proposer des valeurs de champs, uniquement des faits que vous énoncez. Ce ne sont que des propositions : vous les validez avant d'enregistrer.",
  },
  {
    title: "Vos droits",
    text: "Vous pouvez désactiver l'IA à tout moment depuis cet espace : plus rien ne sera envoyé.",
  },
];

// Consentement explicite et éclairé avant tout envoi de données de santé au service d'IA (RGPD art. 9).
export const AiConsentDialog: React.FC<AiConsentDialogProps> = ({ open, onClose, onAccepted }) => {
  const [includeNotes, setIncludeNotes] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiService.post("/health/ai-insights/enable", { consent: true, includeNotes });
      window.dispatchEvent(new CustomEvent("ai-insights-status-changed", { detail: { enabled: true } }));
      onAccepted();
    } catch (err) {
      setError((err as Error).message || "L'activation a échoué. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="ai-consent-title">
      <DialogTitle id="ai-consent-title" sx={{ pb: 1 }}>
        <Typography variant="h4" component="span">Activer l&apos;assistant IA</Typography>
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5 }}>
        {POINTS.map((point) => (
          <Box key={point.title} sx={{ p: 1.5, borderRadius: 3, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2">{point.title}</Typography>
            <Typography variant="body2" color="text.secondary">{point.text}</Typography>
          </Box>
        ))}
        <FormControlLabel
          control={<Checkbox checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />}
          label={<Typography variant="body2">Inclure mes notes libres (réponses plus précises)</Typography>}
        />
        <Typography variant="caption" color="text.secondary">
          L&apos;assistant ne remplace pas un professionnel de santé. Détails dans la{" "}
          <Link href="/privacy" style={{ color: "inherit" }}>politique de confidentialité</Link>.
        </Typography>
        {error && <Typography variant="body2" color="error.main">{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ flex: { xs: 1, sm: "none" } }}>Plus tard</Button>
        <Button onClick={accept} variant="contained" disabled={submitting} sx={{ flex: { xs: 2, sm: "none" } }}>
          {submitting ? "Activation…" : "J'accepte et j'active"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
