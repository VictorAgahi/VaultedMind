"use client";

import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const SECTIONS: { title: string; paragraphs: React.ReactNode[] }[] = [
  {
    title: "1. Ce que nous collectons",
    paragraphs: [
      "Votre adresse e-mail et votre mot de passe (stocké sous forme d'empreinte, jamais en clair), votre prénom si vous le donnez, et les données de bien-être que vous saisissez : valeurs de vos champs (humeur, sommeil, habitudes…), notes libres et réglages.",
      "Si vous activez les rappels, l'adresse technique d'abonnement aux notifications de votre navigateur. Si vous connectez Apple Santé, les mesures envoyées par votre raccourci.",
    ],
  },
  {
    title: "2. Comment elles sont protégées",
    paragraphs: [
      "Vos notes, les valeurs de vos champs, votre e-mail et votre prénom sont chiffrés en AES-256 avant d'être enregistrés dans notre base de données. Les échanges entre l'application et nos serveurs sont chiffrés (HTTPS).",
      "Il s'agit d'un chiffrement côté serveur : nos serveurs détiennent la clé et déchiffrent vos données pour vous les afficher, calculer vos analyses et, si vous l'avez activé, les transmettre à l'assistant IA. Ce n'est pas un chiffrement de bout en bout.",
    ],
  },
  {
    title: "3. Base légale et consentements",
    paragraphs: [
      "Les données de bien-être sont des données de santé au sens de l'article 9 du RGPD. Nous les traitons sur la base de votre consentement explicite, recueilli séparément à l'inscription et horodaté.",
      "L'assistant IA est désactivé par défaut. Son activation demande un second consentement, distinct, lui aussi horodaté. Vous pouvez retirer l'un ou l'autre à tout moment : désactiver l'IA depuis l'espace IA, ou supprimer votre compte depuis votre profil.",
    ],
  },
  {
    title: "4. Assistant IA et sous-traitant",
    paragraphs: [
      "Quand l'IA est activée, nous envoyons à OpenAI (OpenAI, L.L.C., États-Unis) les valeurs de vos 30 à 60 derniers jours, le nom de vos champs et, uniquement si vous l'avez accepté, vos notes libres. Votre e-mail et votre prénom ne sont jamais envoyés.",
      "Ce transfert hors de l'Union européenne repose sur les clauses contractuelles types de la Commission européenne prévues dans l'accord de traitement des données d'OpenAI. Les données servent uniquement à générer votre réponse.",
      "Si vous activez l'analyse avancée du journal, vos notes sont envoyées à OpenAI pour être reformulées, puis à TypeSafe AI (modèle Jev) pour en extraire des repères (événements, thèmes, tonalité). Avant tout envoi, les noms de personnes que vous avez listés dans « Mon entourage » sont remplacés par leurs alias. Votre e-mail et votre prénom ne sont jamais envoyés.",
      "Nous ne vendons ni ne louons vos données, et nous ne les utilisons pas à des fins publicitaires.",
    ],
  },
  {
    title: "5. Durée de conservation",
    paragraphs: [
      "Vos données sont conservées tant que votre compte existe. La suppression du compte efface définitivement et immédiatement votre profil, vos journaux, vos champs, vos bilans IA et vos abonnements aux notifications.",
    ],
  },
  {
    title: "6. Vos droits",
    paragraphs: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Depuis votre profil, vous pouvez exporter toutes vos données dans un fichier JSON lisible et supprimer votre compte.",
      <>
        Pour toute question, écrivez-nous via la page{" "}
        <MuiLink component={Link} href="/contact">Contact</MuiLink>. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).
      </>,
    ],
  },
  {
    title: "7. Ce que VaultedMind n'est pas",
    paragraphs: [
      "VaultedMind est un outil d'auto-observation. Il ne pose pas de diagnostic et ne remplace pas un professionnel de santé. En cas de détresse, appelez le 3114 (prévention du suicide, gratuit, 24 h/24) ou le 15 / 112 en cas d'urgence.",
    ],
  },
];

export default function PrivacyClient() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">Confidentialité</Typography>
      </Breadcrumbs>

      <Paper sx={{ p: { xs: 2.5, md: 6 }, borderRadius: 4 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, mb: 1 }}>
          Politique de confidentialité
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Dernière mise à jour : octobre 2026
        </Typography>

        <Box sx={{ display: "grid", gap: 3, maxWidth: "65ch" }}>
          {SECTIONS.map((section) => (
            <Box key={section.title} component="section" sx={{ display: "grid", gap: 1.5 }}>
              <Typography variant="h4" component="h2">{section.title}</Typography>
              {section.paragraphs.map((paragraph, index) => (
                <Typography key={index} sx={{ lineHeight: 1.7 }}>{paragraph}</Typography>
              ))}
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
}
