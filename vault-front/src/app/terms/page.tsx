"use client";

import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { Footer } from "@/components/organisms/footer/footer";
import GavelIcon from "@mui/icons-material/Gavel";

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 12 }}>
      <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <GavelIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
            Conditions
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem", mb: 6 }}>
          En utilisant VaultedMind, vous acceptez les conditions suivantes visant à assurer la sécurité et
          le respect de tous les utilisateurs.
        </Typography>

        <Divider sx={{ mb: 6 }} />

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          1. Responsabilité du compte
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Vous êtes responsable de la sécurité de votre mot de passe. Étant donné que vos données sont chiffrées
          avec des clés dérivées de vos accès, la perte de votre mot de passe peut entraîner l&apos;impossibilité de
          récupérer vos données.
        </Typography>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>
          2. Usage personnel
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          VaultedMind est un outil de suivi personnel. Il ne remplace en aucun cas un avis médical professionnel,
          un diagnostic ou un traitement psychiatrique. En cas d&apos;urgence, contactez immédiatement les services de secours.
        </Typography>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>
          3. Disponibilité du service
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Nous nous efforçons de maintenir une disponibilité de 99,9% du service. Cependant, des interruptions
          pour maintenance peuvent survenir. Nous vous recommandons d&apos;exporter régulièrement vos données via
          l&apos;outil d&apos;exportation intégré.
        </Typography>

        <Box sx={{ mt: 10, p: 4, bgcolor: "grey.100", borderRadius: 4 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Dernière mise à jour : 10 Mai 2026. VaultedMind se réserve le droit de modifier ces conditions à tout moment.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
