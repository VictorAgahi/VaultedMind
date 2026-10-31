"use client";

import React from "react";
import Link from "next/link";
import { Box, Button, FormControlLabel, Snackbar, Switch, Typography } from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { PeopleEditor } from "@/components/profile/people-editor";
import { InsightTargetsEditor } from "@/components/profile/insight-targets-editor";
import { TrackedSubjectEditor } from "@/components/profile/tracked-subject-editor";
import { CustomSignalsEditor } from "@/components/profile/custom-signals-editor";
import { SettingsBlock } from "./settings-block";
import { settingsHref } from "./settings-routes";
import { usePreferencesPatch } from "./use-preferences-patch";

// Analyse avancée du journal (insights v2) : l'interrupteur, puis chaque réglage une seule fois, dans sa propre carte.
export const AdvancedAnalysisSettings: React.FC = () => {
  const { user } = useAuth();
  const { saving, status, patch, clearStatus } = usePreferencesPatch();

  if (!user) return null;

  if (!user.aiInsightsEnabled) {
    return (
      <SettingsBlock
        title="Assistant IA désactivé"
        description="L'analyse avancée s'appuie sur l'assistant IA. Activez-le d'abord, puis revenez ici."
      >
        <Button component={Link} href={settingsHref("assistant")} variant="contained" fullWidth>
          Ouvrir Assistant IA
        </Button>
      </SettingsBlock>
    );
  }

  const enabled = user.preferences?.insightsV2Enabled ?? false;
  const allowed = Boolean(user.consents?.aiConsentAt) && (user.preferences?.aiIncludeNotes ?? true);

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <SettingsBlock>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              disabled={saving || (!allowed && !enabled)}
              onChange={(e) => patch({ insightsV2Enabled: e.target.checked }, e.target.checked ? "Analyse avancée activée." : "Analyse avancée désactivée.")}
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Analyse avancée du journal (beta)</Typography>
              <Typography variant="caption" color="text.secondary">
                Reformule vos notes dictées en texte propre et en retient les repères de la journée, sans jamais modifier l&apos;original. Vos notes, dont les noms de « Mon entourage » sont remplacés par des alias, sont envoyées à OpenAI pour la reformulation et à TypeSafe AI (modèle Jev) pour l&apos;analyse.
              </Typography>
            </Box>
          }
          sx={{ alignItems: "flex-start", mx: 0, gap: 1, "& .MuiSwitch-root": { mt: -0.5, flex: "none" } }}
        />
        {!allowed && (
          <Typography variant="caption" color="warning.main" role="note" sx={{ display: "block", mt: 1 }}>
            Pour l&apos;activer, incluez d&apos;abord vos notes dans l&apos;IA (Assistant IA).
          </Typography>
        )}
        {!enabled && allowed && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Une fois activée, vous pourrez choisir qui est suivi, votre entourage, ce que vous voulez comprendre et vos signaux personnalisés.
          </Typography>
        )}
      </SettingsBlock>

      {enabled && (
        <>
          <SettingsBlock>
            <TrackedSubjectEditor
              key={JSON.stringify(user.preferences?.trackedSubject ?? { kind: "SELF" })}
              initial={user.preferences?.trackedSubject ?? { kind: "SELF" }}
              saving={saving}
              onSave={(trackedSubject) => patch({ trackedSubject }, "Choix enregistré.")}
            />
          </SettingsBlock>
          <SettingsBlock>
            <PeopleEditor
              key={JSON.stringify(user.preferences?.people ?? [])}
              initial={user.preferences?.people ?? []}
              saving={saving}
              onSave={(people) => patch({ people }, "Entourage enregistré.")}
            />
          </SettingsBlock>
          <SettingsBlock>
            <InsightTargetsEditor
              key={JSON.stringify(user.preferences?.insightTargets ?? [])}
              initial={user.preferences?.insightTargets ?? []}
              saving={saving}
              onSave={(insightTargets) => patch({ insightTargets }, "Choix enregistrés.")}
            />
          </SettingsBlock>
          <SettingsBlock>
            <CustomSignalsEditor
              key={JSON.stringify(user.preferences?.customSignals ?? [])}
              initial={user.preferences?.customSignals ?? []}
              saving={saving}
              onSave={(customSignals) => patch({ customSignals }, "Signaux enregistrés.")}
            />
          </SettingsBlock>
        </>
      )}

      <Snackbar open={status !== null} autoHideDuration={4000} onClose={clearStatus} message={status} sx={{ bottom: { xs: "calc(88px + env(safe-area-inset-bottom, 0px))", md: 24 } }} />
    </Box>
  );
};
