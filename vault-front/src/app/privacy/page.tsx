"use client";

import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { Footer } from "@/components/organisms/footer/footer";
import SecurityIcon from "@mui/icons-material/Security";

export default function PrivacyPage() {
  return (
    <Box sx={{ bgcolor: "#f9fafb", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 12 }}>
        <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 6, border: "1px solid #e5e7eb" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <SecurityIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
              Confidentialité
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem", mb: 6 }}>
            Chez VaultedMind, la protection de vos données de santé mentale n&apos;est pas une option, c&apos;est notre fondation.
            Voici comment nous garantissons que vos pensées restent strictement privées.
          </Typography>

          <Divider sx={{ mb: 6 }} />

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            1. Chiffrement de bout en bout (At Rest)
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Chaque note, chaque journal et chaque champ personnalisé que vous créez est chiffré à l&apos;aide de l&apos;algorithme
            <strong> AES-256-GCM</strong> avant d&apos;être enregistré dans notre base de données. Même nos administrateurs
            système ne peuvent pas lire votre contenu.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>
            2. Anonymisation par Blind Index
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Votre adresse e-mail est également chiffrée. Nous utilisons une technique de &quot;Blind Indexing&quot; pour vous
            permettre de vous connecter sans jamais stocker votre e-mail en clair dans nos systèmes.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>
            3. Souveraineté des données
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Vos données vous appartiennent. Vous pouvez à tout moment exporter l&apos;intégralité de vos journaux ou
            demander la suppression définitive de votre compte, ce qui effacera irrémédiablement toutes les clés de
            déchiffrement associées à votre profil.
          </Typography>

          <Box sx={{ mt: 10, p: 4, bgcolor: "primary.light", borderRadius: 4, color: "primary.contrastText" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Engagement VaultedMind
            </Typography>
            <Typography variant="body2">
              Nous ne vendrons jamais vos données. Nous ne les partagerons jamais avec des tiers.
              Votre esprit est votre sanctuaire, nous ne faisons que fournir les murs blindés.
            </Typography>
          </Box>
        </Paper>
      </Container>
      <Footer />
    </Box>
  );
}
