"use client";

import { Box, Typography, Container, Divider, Link as MuiLink } from "@mui/material";
import Link from "next/link";

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "primary.main",
              textDecoration: "none",
            }}
            component={Link}
            href="/"
          >
            VaultedMind
          </Typography>

          <Box sx={{ display: "flex", gap: 3 }}>
            <MuiLink component={Link} href="/privacy" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Politique de confidentialité
            </MuiLink>
            <MuiLink component={Link} href="/terms" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Conditions d&apos;utilisation
            </MuiLink>
            <MuiLink component={Link} href="/contact" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Contact
            </MuiLink>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          {"Copyright © "}
          VaultedMind {year}
          {" - Sécurisez votre bien-être mental."}
        </Typography>
      </Container>
    </Box>
  );
};
