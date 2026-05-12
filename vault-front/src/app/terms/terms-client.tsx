"use client";

import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function TermsClient() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 4 }}
      >
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">Conditions</Typography>
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
          Conditions d&apos;Utilisation
        </Typography>

        <Box sx={{ "& p": { mb: 2, color: "text.primary", lineHeight: 1.7 } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2, color: "text.primary" }}>1. Acceptation des termes</Typography>
          <Typography>
            En utilisant VaultedMind, vous acceptez d&apos;être lié par ces conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces termes, veuillez ne pas utiliser l&apos;application.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>2. Pas un service médical</Typography>
          <Typography>
            VaultedMind est un outil de suivi personnel et d&apos;auto-réflexion. Il ne remplace en aucun cas un avis médical, un diagnostic ou un traitement professionnel. En cas de crise, contactez immédiatement les services d&apos;urgence.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>3. Compte Utilisateur</Typography>
          <Typography>
            Vous êtes responsable du maintien de la confidentialité de votre mot de passe et de votre compte. VaultedMind ne pourra être tenu responsable de toute perte ou dommage résultant de votre manquement à protéger vos informations de connexion.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>4. Modifications du service</Typography>
          <Typography>
            Nous nous réservons le droit de modifier ou d&apos;interrompre le service à tout moment. Nous vous informerons de toute modification majeure par le biais de l&apos;application.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
