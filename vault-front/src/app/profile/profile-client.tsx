"use client";

import React from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar/navbar";
import { CrisisResources } from "@/components/support/crisis-resources";
import { PersonalSettings } from "@/components/profile/personal-settings";
import { apiService } from "@/services/api.service";
import { settingsHref } from "@/components/settings/settings-routes";

// Profil : l'identité et le compte. Tous les réglages vivent dans /settings.
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  if (!user) return null;

  const initial = (user.firstName?.[0] || user.email?.[0] || "U").toUpperCase();

  const deleteAccount = async () => {
    if (!window.confirm("ÊTES-VOUS ABSOLUMENT SÛR ? Cette action est irréversible et supprimera définitivement votre coffre-fort mental, vos clés de chiffrement et toutes vos données de santé.")) return;
    try {
      await apiService.delete("/auth/account");
      logout();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, sm: 3 }, display: "grid", gap: 1.5 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, mb: 0.5 }}>
          Mon profil
        </Typography>

        <Paper sx={{ p: 2, borderRadius: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.light", color: "primary.main", fontWeight: 700, fontSize: "1.5rem" }}>
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {user.firstName || "Utilisateur VaultedMind"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
          </Box>
          <PersonalSettings />
        </Paper>

        <ButtonBase
          component={Link}
          href="/settings"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2,
            minHeight: 72,
            borderRadius: 4,
            textAlign: "left",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            transition: "transform 160ms cubic-bezier(.2,0,0,1)",
            "&:active": { transform: "scale(0.98)" },
          }}
        >
          <TuneRoundedIcon />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>Paramètres</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Analyse avancée, assistant IA, rappels, confidentialité, mes données
            </Typography>
          </Box>
          <ChevronRightIcon />
        </ButtonBase>

        <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
          <List disablePadding aria-label="Compte">
            <ListItemButton component={Link} href={settingsHref("confidentialite", "app-lock")} sx={{ minHeight: 60, px: 2 }}>
              <ListItemText
                primary="Sécurité du compte"
                secondary="Code de verrouillage, consentements"
                slotProps={{ primary: { sx: { fontWeight: 700 } } }}
              />
              <ChevronRightIcon sx={{ color: "text.disabled" }} />
            </ListItemButton>
          </List>
          <Divider />
          <Box sx={{ p: 2, display: "grid", gap: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="outlined" color="inherit" fullWidth onClick={logout} startIcon={<LogoutIcon />}>
              Se déconnecter
            </Button>
            <Button color="error" fullWidth onClick={deleteAccount} startIcon={<DeleteForeverIcon />}>
              Supprimer définitivement mon compte
            </Button>
          </Box>
        </Paper>

        <CrisisResources />
      </Container>
    </Box>
  );
}
