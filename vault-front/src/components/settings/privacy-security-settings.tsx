"use client";

import React from "react";
import Link from "next/link";
import { Box, List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "@/context/auth-context";
import { AppLockSettings } from "@/components/app-lock/app-lock-settings";
import { SettingsBlock } from "./settings-block";
import { settingsHref } from "./settings-routes";

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const LINKS = [
  { href: "/privacy", label: "Politique de confidentialité", hint: "Ce qui est collecté, chiffré et envoyé" },
  { href: "/security-policy", label: "Sécurité", hint: "Chiffrement et protection du coffre" },
  { href: "/terms", label: "Conditions d'utilisation" },
];

export const PrivacySecuritySettings: React.FC = () => {
  const { user } = useAuth();
  const healthConsentAt = user?.consents?.healthDataConsentAt;
  const aiConsentAt = user?.consents?.aiConsentAt;

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <SettingsBlock id="app-lock" title="Verrouillage par code">
        <AppLockSettings />
      </SettingsBlock>

      <SettingsBlock title="Mes consentements">
        <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.25 }}>
          {healthConsentAt && (
            <Box>
              <Typography component="dt" variant="body2" sx={{ fontWeight: 700 }}>Données de santé</Typography>
              <Typography component="dd" variant="body2" color="text.secondary" sx={{ m: 0 }}>
                Accordé le {formatDate(healthConsentAt)}.
              </Typography>
            </Box>
          )}
          <Box>
            <Typography component="dt" variant="body2" sx={{ fontWeight: 700 }}>Assistant IA</Typography>
            <Typography component="dd" variant="body2" color="text.secondary" sx={{ m: 0 }}>
              {user?.aiInsightsEnabled && aiConsentAt ? `Accordé le ${formatDate(aiConsentAt)}. ` : "Non accordé. "}
              <Link href={settingsHref("assistant")} style={{ color: "inherit" }}>Gérer dans Assistant IA</Link>
            </Typography>
          </Box>
        </Box>
      </SettingsBlock>

      <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
        <List disablePadding aria-label="Documents">
          {LINKS.map(({ href, label, hint }) => (
            <ListItemButton key={href} component={Link} href={href} sx={{ minHeight: 56, px: 2 }}>
              <ListItemText primary={label} secondary={hint} slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
              <ChevronRightIcon sx={{ color: "text.disabled" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  );
};
