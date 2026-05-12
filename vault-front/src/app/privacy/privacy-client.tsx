"use client";

import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function PrivacyClient() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 4 }}
      >
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">Confidentialité</Typography>
      </Breadcrumbs>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 6 },
          borderRadius: 4,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "primary.main",
        }}
      >
        <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 4, color: "primary.main" }}>
          Politique de Confidentialité
        </Typography>

        <Box sx={{ "& p": { mb: 2, color: "text.primary", lineHeight: 1.7 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>1. Notre Philosophie</Typography>
          <Typography>
            Chez VaultedMind, nous croyons que votre santé mentale est ce que vous avez de plus précieux. Notre application est conçue avec le principe de la <strong>Privacy by Design</strong>.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>2. Chiffrement de bout en bout</Typography>
          <Typography>
            Toutes vos notes et journaux de bord sont chiffrés avant d&apos;être envoyés sur nos serveurs. Nous utilisons des algorithmes de pointe (AES-256) pour garantir que vous êtes la seule personne capable de lire vos écrits.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>3. Conformité RGPD et Sécurité OWASP</Typography>
          <Typography>
            VaultedMind est pleinement conforme au <strong>Règlement Général sur la Protection des Données (RGPD)</strong>. Nous suivons les recommandations de l&apos;<strong>OWASP (Open Web Application Security Project)</strong> pour protéger nos infrastructures contre les vulnérabilités les plus critiques.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>4. Utilisation des données</Typography>
          <Typography>
            Nous ne vendons jamais vos données. Vos informations ne sont utilisées que pour générer vos propres graphiques et analyses de corrélation via des algorithmes de traitement chiffré.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>5. Vos droits</Typography>
          <Typography>
            Vous disposez d&apos;un droit total d&apos;accès, de modification et de suppression de vos données. En tant que <strong>coffre-fort mental numérique</strong>, nous vous permettons d&apos;exporter l&apos;intégralité de vos données chiffrées à tout moment.
          </Typography>
        </Box>

      </Paper>
    </Container>
  );
}
