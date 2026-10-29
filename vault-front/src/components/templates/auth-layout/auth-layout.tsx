"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { Box, Typography, Container } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { BrandSeal, BrandWordmark } from "@/components/brand/brand-mark";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

// Mobile : le formulaire seul, la marque au-dessus. Desktop : un panneau d'encre à gauche.
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, minHeight: "100dvh", bgcolor: "background.default" }}>
    <Box
      sx={{
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: 8,
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <BrandSeal size={56} />
      <Box sx={{ maxWidth: 460, display: "grid", gap: 3 }}>
        <Typography variant="h1" sx={{ color: "inherit", fontSize: "3.5rem" }}>
          Comprendre ce qui vous fait du bien.
        </Typography>
        <Typography sx={{ fontSize: "1.125rem", opacity: 0.85, lineHeight: 1.6 }}>
          Notez votre journée en une minute. VaultedMind relie vos habitudes et vos ressentis, et stocke vos données chiffrées.
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, opacity: 0.8 }}>
        <LockOutlinedIcon fontSize="small" />
        <Typography variant="body2" sx={{ color: "inherit" }}>Données stockées chiffrées en AES-256</Typography>
      </Box>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", px: 2, py: { xs: 4, md: 6 } }}>
      <Container maxWidth="sm" disableGutters sx={{ display: "grid", gap: 3 }}>
        <Box component={Link} href="/" aria-label="Accueil VaultedMind" sx={{ display: { xs: "flex", lg: "none" }, justifyContent: "center", textDecoration: "none" }}>
          <BrandWordmark size={40} />
        </Box>
        {children}
      </Container>
    </Box>
  </Box>
);
