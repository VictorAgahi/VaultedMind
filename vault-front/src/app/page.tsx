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

export default function Home() {
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
              <Typography variant="h1" sx={{ fontSize: { xs: "3rem", md: "4.5rem" }, mb: 3 }}>
                Sécurisez votre <Box component="span" sx={{ color: "primary.main" }}>Esprit</Box>.
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 5, lineHeight: 1.6, maxWidth: 600 }}>
                VaultedMind est une plateforme de chiffrement de pointe pour vos pensées les plus personnelles,
                vos dossiers de santé et votre héritage numérique. Conçu pour la confidentialité, pensé pour votre tranquillité.
              </Typography>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                sx={{ py: 2, px: 4, fontSize: "1.1rem" }}
              >
                Initialiser votre coffre
              </Button>
            </Grid>
          </Grid>
        </Container>

        <Box sx={{ py: 12 }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <ShieldIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Chiffrement de bout en bout
                    </Typography>
                    <Typography color="text.secondary">
                      Vos données sont cryptées avant même de quitter votre appareil. Vous seul détenez la clé.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <AnalyticsIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Suivi de santé mentale
                    </Typography>
                    <Typography color="text.secondary">
                      Des analyses avancées pour vous aider à comprendre vos schémas émotionnels au fil du temps.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <HistoryEduIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Héritage Numérique
                    </Typography>
                    <Typography color="text.secondary">
                      Transmettez votre héritage numérique en toute sécurité grâce à notre technologie de &quot;Dead Man&apos;s Switch&quot;.
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
