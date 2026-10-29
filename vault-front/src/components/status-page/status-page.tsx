"use client";

import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { BrandSeal } from "@/components/brand/brand-mark";

interface StatusPageProps {
  code?: string;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}

// Gabarit commun des pages 404, 403 et erreur : le sceau, un titre clair, une action pour repartir.
export const StatusPage: React.FC<StatusPageProps> = ({ code, title, description, actions, footer }) => (
  <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", bgcolor: "background.default", px: 2, py: 6 }}>
    <Container maxWidth="sm" disableGutters sx={{ display: "grid", gap: 2.5, justifyItems: { xs: "start", sm: "center" }, textAlign: { xs: "left", sm: "center" } }}>
      <BrandSeal size={48} />
      {code && (
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: "4rem", md: "6rem" }, lineHeight: 1, color: "primary.main", fontVariantNumeric: "tabular-nums" }}>
          {code}
        </Typography>
      )}
      <Typography variant="h2" component="h1">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 460 }}>{description}</Typography>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", width: { xs: "100%", sm: "auto" }, justifyContent: "center", mt: 1, "& > *": { flex: { xs: "1 1 100%", sm: "none" } } }}>
        {actions}
      </Box>
      {footer}
    </Container>
  </Box>
);
