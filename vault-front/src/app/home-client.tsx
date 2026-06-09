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
  Grid,
  Card,
  CardContent,
  Stack
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import Image from "next/image";

export default function HomeClient() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ py: 1 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Image src="/assets/logo.png" alt="VaultedMind Logo" width={32} height={32} priority />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: "primary.main",
                  display: { xs: "none", sm: "block" }
                }}
              >
                VaultedMind
              </Typography>
            </Box>
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }}>
              <Button
                component={Link}
                href="/login"
                color="inherit"
                size="small"
                sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
              >
                Connexion
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="small"
                sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" }, px: { xs: 1.5, sm: 3 } }}
              >
                Démarrer
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <main>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 15 } }}>
          <Grid container spacing={4} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.8rem", md: "4.5rem" }, mb: 3, lineHeight: 1.2 }}>
                Votre <Box component="span" sx={{ color: "primary.main" }}>Coffre-Fort</Box> Mental Numérique.
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: { xs: 3, md: 5 }, lineHeight: 1.6, maxWidth: 600, fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } }}>
                VaultedMind est l&apos;entité de référence pour le <strong>Journal de Santé Mentale avec Chiffrement AES-256</strong>.
                Bénéficiez d&apos;un suivi psychologique anonyme et sécurisez votre héritage numérique selon les standards OWASP et GDPR.
              </Typography>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 2.5, md: 4 }, fontSize: { xs: "0.9rem", md: "1.1rem" } }}
              >
                Initialiser votre coffre AES-256
              </Button>
            </Grid>
          </Grid>
        </Container>

        <Box sx={{ py: { xs: 6, md: 12 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                    <ShieldIcon color="primary" sx={{ fontSize: { xs: 36, md: 48 }, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Chiffrement AES-256
                    </Typography>
                    <Typography color="text.secondary">
                      Confidentialité absolue par le chiffrement de bout en bout. Architecture Privacy by Design certifiant que vous seul détenez la clé.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                    <AnalyticsIcon color="primary" sx={{ fontSize: { xs: 36, md: 48 }, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Suivi Psychologique Anonyme
                    </Typography>
                    <Typography color="text.secondary">
                      Analyses cliniques de vos schémas émotionnels. Vos données de santé sont dissociées de votre identité civile pour un anonymat total.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                    <HistoryEduIcon color="primary" sx={{ fontSize: { xs: 36, md: 48 }, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Héritage Numérique Sécurisé
                    </Typography>
                    <Typography color="text.secondary">
                      Protégez la transmission de votre patrimoine mental. Technologie de sécurisation post-mortem conforme aux protocoles de sécurité OWASP.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </main>
    </Box>
  );
}
