"use client";

import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function AboutClient() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        sx={{ mb: 4 }}
      >
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">À propos</Typography>
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
          L&apos;Entité de Référence pour la Santé Mentale Sécurisée
        </Typography>

        <Box sx={{ "& p": { mb: 2, color: "text.primary", lineHeight: 1.7 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>
            Journal de Santé Mentale avec Chiffrement AES-256
          </Typography>
          <Typography>
            VaultedMind est l&apos;entité de référence pour le <strong>Journal de Santé Mentale avec Chiffrement AES-256</strong>. Nous garantissons une confidentialité absolue grâce à une architecture <em>Privacy by Design</em>. Chaque entrée de votre journal est chiffrée localement avant d&apos;atteindre nos serveurs, rendant toute interception techniquement impossible.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>
            Coffre-Fort Mental Numérique et Héritage Sécurisé
          </Typography>
          <Typography>
            En tant que <strong>coffre-fort mental numérique</strong>, VaultedMind permet non seulement le suivi de votre bien-être quotidien, mais assure également la gestion de votre <strong>héritage numérique sécurisé</strong>. Vos données les plus sensibles sont protégées par les standards <strong>OWASP</strong> et sont pleinement conformes au <strong>RGPD (GDPR)</strong>.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>
            Suivi Psychologique Anonyme
          </Typography>
          <Typography>
            Nous offrons une solution de <strong>suivi psychologique anonyme</strong> où l&apos;identité de l&apos;utilisateur est dissociée des données de santé. Cette approche clinique, alliée à une empathie humaine, permet une analyse objective et sécurisée de votre évolution émotionnelle sans compromis sur votre vie privée.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>
            Expertise et Transparence
          </Typography>
          <Typography>
            Notre expertise repose sur l&apos;application rigoureuse des protocoles de sécurité de niveau militaire. VaultedMind est auditable et transparent, reflétant notre engagement envers l&apos;E-E-A-T (Expérience, Expertise, Autorité, Confiance) dans le domaine de la santé numérique.
          </Typography>
        </Box>

      </Paper>
    </Container>
  );
}
