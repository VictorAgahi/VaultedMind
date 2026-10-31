"use client";

import { Box, Typography, Container, Divider, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { SETTINGS_ROUTES } from "@/components/settings/settings-routes";

// Dans l'espace connecté, le pied de page n'apparaît que sur grand écran : sur mobile, la barre du bas suffit.
const appRoutes = ["/dashboard", "/import", "/fields", "/analytics", "/profile", "/ai", "/integrations", ...SETTINGS_ROUTES];
// Écrans plein écran : aucun pied de page.
const immersiveRoutes = ["/ai/chat", "/onboarding"];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const inApp = appRoutes.includes(pathname);
  if (immersiveRoutes.includes(pathname)) return null;

  return (
    <Box
      component="footer"
      sx={{
        display: inApp ? { xs: "none", md: "block" } : "block",
        py: { xs: 4, md: 6 },
        px: 2,
        mt: "auto",
        backgroundColor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mb: 4,
          }}
        >
          <Box component={Link} href="/" aria-label="Accueil VaultedMind" sx={{ textDecoration: "none", display: "flex" }}>
            <BrandWordmark size={28} />
          </Box>

          <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 3 }, flexWrap: "wrap", justifyContent: "center" }}>
            <MuiLink component={Link} href="/privacy" color="text.secondary" variant="body2" sx={{ textDecoration: "none", py: 1 }}>
              Politique de confidentialité
            </MuiLink>
            <MuiLink component={Link} href="/terms" color="text.secondary" variant="body2" sx={{ textDecoration: "none", py: 1 }}>
              Conditions d&apos;utilisation
            </MuiLink>
            <MuiLink component={Link} href="/contact" color="text.secondary" variant="body2" sx={{ textDecoration: "none", py: 1 }}>
              Contact
            </MuiLink>
            <MuiLink href="https://github.com/VictorAgahi/VaultedMind" target="_blank" rel="noopener noreferrer" color="text.secondary" variant="body2" sx={{ textDecoration: "none", py: 1 }}>
              GitHub
            </MuiLink>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          {"Copyright © "}
          VaultedMind {year}
          {". Votre carnet, chiffré."}
        </Typography>
      </Container>
    </Box>
  );
};
