"use client";

import React from "react";
import Link from "next/link";
import { Alert, Box, Button, CircularProgress, Link as MuiLink, Paper, Typography } from "@mui/material";
import { apiService } from "@/services/api.service";
import type { ApiError, PatternReport, PatternResponse } from "@/types";
import { LeversReport } from "./levers-report";
import { formatDay } from "./levers-parts";

const RECOMPUTE_COOLDOWN_MS = 15 * 60 * 1000;

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Message calme quand le serveur refuse un recalcul trop rapproché.
const tooSoonMessage = (computedAt: string | null): string => {
  if (computedAt) {
    const next = new Date(new Date(computedAt).getTime() + RECOMPUTE_COOLDOWN_MS);
    if (next.getTime() > Date.now()) {
      return `Le calcul vient d'être fait. Tu pourras le relancer à partir de ${formatTime(next)}.`;
    }
  }
  return "Un calcul est déjà en cours. Reviens dans quelques minutes.";
};

const Disclaimer: React.FC = () => (
  <Typography variant="body2" color="text.secondary">
    Ce sont des liens observés dans tes données, pas des causes ni un diagnostic.
  </Typography>
);

export const LeversView: React.FC = () => {
  const [response, setResponse] = React.useState<PatternResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [recomputing, setRecomputing] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    apiService
      .get<PatternResponse>("/insights/patterns", { signal: controller.signal })
      .then(setResponse)
      .catch((error: ApiError) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setLoadError("Les liens n'ont pas pu être chargés. Réessaie dans un instant.");
      });
    return () => controller.abort();
  }, []);

  const computedAt = response && response.status !== "not_computed" ? response.computedAt : null;

  const recompute = async () => {
    setRecomputing(true);
    setNotice(null);
    try {
      setResponse(await apiService.post<PatternReport>("/insights/patterns/recompute"));
    } catch (error) {
      setNotice(
        (error as ApiError).statusCode === 429
          ? tooSoonMessage(computedAt)
          : "Le calcul n'a pas pu être lancé. Réessaie dans un instant.",
      );
    } finally {
      setRecomputing(false);
    }
  };

  if (!response && !loadError) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress aria-label="Chargement" />
      </Box>
    );
  }
  if (loadError) return <Alert severity="info">{loadError}</Alert>;
  if (!response) return null;

  const recomputeButton = (
    <Button variant="outlined" onClick={recompute} disabled={recomputing} sx={{ justifySelf: "start" }}>
      {recomputing ? "Calcul en cours..." : "Recalculer"}
    </Button>
  );

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Paper component="header" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 1 }}>
        <Typography variant="h4" component="h2">Mes leviers</Typography>
        <Disclaimer />
        {response.status !== "not_computed" && (
          <Typography variant="caption" color="text.secondary">
            Calculé le {formatDay(response.computedAt.slice(0, 10))} · {response.daysLogged} jour{response.daysLogged > 1 ? "s" : ""} notés
          </Typography>
        )}
        {recomputeButton}
        {notice && <Typography variant="body2" role="status">{notice}</Typography>}
      </Paper>

      {response.status === "not_computed" && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4 }}>
          <Typography variant="body2">
            Les liens sont calculés chaque nuit. Rien n&apos;est encore disponible pour toi : tu peux lancer le calcul maintenant avec « Recalculer ».
          </Typography>
        </Paper>
      )}

      {response.status === "insufficient_data" && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 0.5 }}>
          <Typography variant="h5" component="h2">
            {response.daysLogged} jour{response.daysLogged > 1 ? "s" : ""} sur {response.requiredLoggedDays} nécessaires
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Il faut un peu plus de recul pour repérer des liens fiables. Continue à noter tes journées, à ton rythme.
          </Typography>
        </Paper>
      )}

      {response.status === "no_targets" && (
        <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 0.5 }}>
          <Typography variant="body2">
            Aucun repère n&apos;est choisi pour l&apos;instant. Choisis jusqu&apos;à 6 repères dans la section{" "}
            <MuiLink component={Link} href="/profile#insight-targets">Ce que je veux comprendre</MuiLink> de ton profil.
          </Typography>
        </Paper>
      )}

      {response.status === "ok" && <LeversReport report={response} />}
    </Box>
  );
};
