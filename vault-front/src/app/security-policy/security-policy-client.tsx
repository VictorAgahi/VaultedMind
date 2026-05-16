"use client";

import {
  Container,
  Typography,
  Box,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  Divider,
} from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SecurityIcon from "@mui/icons-material/Security";
import BugReportIcon from "@mui/icons-material/BugReport";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

const sections = [
  {
    icon: <SecurityIcon color="primary" />,
    title: "1. Notre engagement sécurité",
    content:
      "VaultedMind applique une approche de sécurité en profondeur (Defense in Depth). " +
      "Toutes les données utilisateurs sont chiffrées en AES-256 avant persistance. " +
      "Notre infrastructure est conforme aux standards OWASP Top 10 et RGPD. " +
      "Nous effectuons des audits réguliers et des tests de pénétration pour maintenir un niveau de sécurité maximal.",
  },
  {
    icon: <BugReportIcon color="primary" />,
    title: "2. Divulgation responsable (Responsible Disclosure)",
    content:
      "Si vous découvrez une vulnérabilité sur notre plateforme, nous vous encourageons à nous la signaler de manière responsable. " +
      "Envoyez un rapport détaillé à security@cyrus-ag.com avec : la description du problème, " +
      "les étapes pour reproduire la vulnérabilité, l'impact potentiel estimé et vos coordonnées (optionnel). " +
      "Nous nous engageons à accuser réception sous 48h et à corriger les vulnérabilités critiques sous 7 jours.",
  },
  {
    icon: <VerifiedUserIcon color="primary" />,
    title: "3. Périmètre de la politique",
    content:
      "Cette politique couvre l'ensemble des services VaultedMind accessibles via vault-mind.cyrus-ag.com " +
      "et api-vault-mind.cyrus-ag.com. Les tests de sécurité destructifs (DDoS, force brute à grande échelle) " +
      "sont exclus du périmètre et peuvent faire l'objet de poursuites judiciaires.",
  },
  {
    icon: <MailOutlineIcon color="primary" />,
    title: "4. Contact sécurité",
    content:
      "Pour tout signalement de vulnérabilité ou question relative à la sécurité de la plateforme, " +
      "contactez notre équipe sécurité à security@cyrus-ag.com. " +
      "Nous ne pratiquons pas de bug bounty à ce jour, mais chaque signalement valide sera reconnu publiquement si le chercheur le souhaite.",
  },
];

const stack = ["AES-256 E2E", "OWASP Top 10", "RGPD", "TLS 1.3", "CSP", "HSTS", "K3s + Traefik", "Cert-Manager"];

export default function SecurityPolicyClient() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 4 }}
      >
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">Politique de Sécurité</Typography>
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
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 900, mb: 2, color: "primary.main" }}
        >
          Politique de Sécurité
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Dernière mise à jour : Mai 2026 · Conforme RFC 9116 (security.txt)
        </Typography>

        {/* Tech stack badges */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
          {stack.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
          ))}
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((section) => (
            <Box key={section.title}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                {section.icon}
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  {section.title}
                </Typography>
              </Box>
              <Typography
                sx={{ color: "text.primary", lineHeight: 1.8, pl: 4.5 }}
              >
                {section.content}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mt: 5, mb: 3 }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: "action.hover",
          }}
        >
          <MailOutlineIcon fontSize="small" color="primary" />
          <Typography variant="body2" color="text.secondary">
            Contact sécurité :{" "}
            <MuiLink href="mailto:security@cyrus-ag.com" color="primary">
              security@cyrus-ag.com
            </MuiLink>{" "}
            · Fichier machine :{" "}
            <MuiLink
              href="/.well-known/security.txt"
              color="primary"
              target="_blank"
              rel="noopener"
            >
              /.well-known/security.txt
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
