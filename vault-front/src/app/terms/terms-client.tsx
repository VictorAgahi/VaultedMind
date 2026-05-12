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

          <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>5. Partage de Contenu (IA)</Typography>
          <Typography sx={{ bgcolor: "rgba(0,0,0,0.02)", p: 3, borderRadius: 2, borderLeft: "4px solid", borderColor: "primary.main", fontStyle: "italic", fontSize: "0.9rem" }}>
            This Content Sharing Agreement is between OpenAI, L.L.C. (“us” or “we”) and you (“Customer”). This Content Sharing Agreement is incorporated into the terms located at https://openai.com/policies/business-terms unless the parties have negotiated a separate agreement for the Services, in which case such agreement will govern (the “Business Terms”). Capitalized terms not defined here are defined in the Business Terms or the Data Processing Agreement between the parties in connection with the Services (the “DPA”). This Content Sharing Agreement takes precedence in the event of any conflict.
            <br /><br />
            Notwithstanding anything set forth in the Business Terms, we may use Customer Content that is designated by your organization owner in your account (“Designated Content”) to develop and improve the Services, including for training our models and other research, development, evaluation, and testing purposes (“Development Purposes”). You expressly agree that use of Designated Content for the Development Purposes is not subject to the provisions of the DPA nor is it subject to the security measures, auditing, or other obligations applicable to Customer Content that is not Designated Content for the Development Purposes. OpenAI will process such Designated Content for Development Purposes as an independent Data Controller. You are responsible for all Input provided by you and your End Users.
            <br /><br />
            You also represent and warrant that you have the rights, licenses, and permissions necessary – including as applicable that you have provided any notice to End Users, and collected any relevant consent from End Users (“Notice”) – to provide the Input to the Services for the Development Purposes. You agree that you and your End Users will not provide any information as Input to the Services that you or your End Users do not want to be used for Development Purposes, such as sensitive, confidential, or proprietary information. You also agree that you will not use the Services to process (a) any data that includes or constitutes “Protected Health Information,” as defined under the HIPAA Privacy Rule (45 C.F.R. Section 160.103), or (b) any Personal Data of children under 13 or the applicable age of digital consent. You also agree that you will provide OpenAI a copy of your Notice upon OpenAI&apos;s request.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
