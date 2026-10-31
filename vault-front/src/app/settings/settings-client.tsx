"use client";

import Link from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar/navbar";
import { ThemeModeSwitch } from "@/components/theme-mode-switch";
import { SettingsSectionList } from "@/components/settings/settings-section-list";

export default function SettingsClient() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, sm: 3 }, display: "grid", gap: 1.5 }}>
        <Button component={Link} href="/profile" startIcon={<ArrowBackRoundedIcon />} color="inherit" size="small" sx={{ justifySelf: "start", color: "text.secondary", ml: -1 }}>
          Profil
        </Button>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, mb: 0.5 }}>
          Paramètres
        </Typography>

        <SettingsSectionList />

        <Paper sx={{ p: 2, borderRadius: 4 }}>
          <Typography variant="subtitle1" component="h2">Apparence</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1.5 }}>
            Le mode sombre est plus doux pour écrire le soir.
          </Typography>
          <ThemeModeSwitch />
        </Paper>
      </Container>
    </Box>
  );
}
