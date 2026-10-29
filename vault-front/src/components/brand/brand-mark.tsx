import React from "react";
import { Box, Typography } from "@mui/material";

// Sceau VaultedMind : un cercle d'encre, un V gravé, une lueur ambrée au centre.
export const BrandSeal: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <Box component="svg" viewBox="0 0 52 52" aria-hidden sx={{ width: size, height: size, flex: "none", display: "block" }}>
    <circle cx="26" cy="26" r="25" fill="var(--mui-palette-primary-main)" />
    <circle cx="26" cy="26" r="19" fill="none" stroke="var(--mui-palette-primary-contrastText)" strokeWidth="1.5" opacity="0.45" />
    <path d="M17 17 L26 36 L35 17" fill="none" stroke="var(--mui-palette-primary-contrastText)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="26" cy="22" r="2.6" fill="var(--accent-glow)" />
  </Box>
);

export const BrandWordmark: React.FC<{ size?: number; hideTextOnMobile?: boolean }> = ({ size = 32, hideTextOnMobile }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
    <BrandSeal size={size} />
    <Typography
      component="span"
      sx={{
        display: hideTextOnMobile ? { xs: "none", sm: "inline" } : "inline",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: size >= 36 ? "1.375rem" : "1.1875rem",
        letterSpacing: "-0.02em",
        color: "text.primary",
      }}
    >
      VaultedMind
    </Typography>
  </Box>
);
