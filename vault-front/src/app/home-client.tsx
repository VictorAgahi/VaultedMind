"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Container,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import { BrandWordmark } from "@/components/brand/brand-mark";

const features = [
  {
    icon: EditNoteOutlinedIcon,
    title: "Une minute par jour",
    text: "Humeur, sommeil, habitudes : vous choisissez ce que vous suivez. La saisie tient sur un écran de téléphone.",
  },
  {
    icon: InsightsOutlinedIcon,
    title: "Des liens qui apparaissent",
    text: "Les analyses relient vos habitudes et vos ressentis. Vous voyez, par exemple, si vous dormez mieux les jours de sport.",
  },
  {
    icon: LockOutlinedIcon,
    title: "Des données protégées",
    text: "Vos entrées sont stockées chiffrées en AES-256, et votre e-mail est protégé séparément. L'assistant IA est désactivé par défaut : rien ne lui est envoyé tant que vous ne l'activez pas.",
  },
];

export default function HomeClient() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: "space-between", gap: 1, minHeight: 64 }}>
            <BrandWordmark size={32} />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button component={Link} href="/login" color="inherit" size="small">
                Connexion
              </Button>
              <Button component={Link} href="/register" variant="contained" size="small" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                Créer mon carnet
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <main>
        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 12 }, pb: { xs: 6, md: 10 } }}>
          <Box sx={{ maxWidth: 760, display: "grid", gap: { xs: 2.5, md: 3.5 } }}>
            <Typography variant="h1" sx={{ fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.75rem" }, textWrap: "balance" }}>
              Comprendre ce qui vous fait du bien, un jour à la fois.
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.0625rem", md: "1.25rem" }, color: "text.secondary", maxWidth: 600, lineHeight: 1.6 }}>
              Notez votre journée en une minute. VaultedMind relie vos habitudes et vos ressentis, et garde vos données chiffrées sur ses serveurs.
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
              <Button component={Link} href="/register" variant="contained" size="large" sx={{ flex: { xs: "1 1 100%", sm: "none" } }}>
                Créer mon carnet chiffré
              </Button>
              <Button component={Link} href="/login" variant="text" size="large" color="inherit" sx={{ flex: { xs: "1 1 100%", sm: "none" } }}>
                J&apos;ai déjà un compte
              </Button>
            </Box>
          </Box>
        </Container>

        <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 14 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
            {features.map(({ icon: Icon, title, text }) => (
              <Box key={title} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4, bgcolor: "background.paper", display: "grid", gap: 1.5, alignContent: "start" }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: "primary.light", color: "primary.main", display: "grid", placeItems: "center" }}>
                  <Icon />
                </Box>
                <Typography variant="h5" component="h2">{title}</Typography>
                <Typography color="text.secondary">{text}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </main>
    </Box>
  );
}
