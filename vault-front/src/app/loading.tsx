"use client";

import { Box, CircularProgress } from "@mui/material";
import { BrandSeal } from "@/components/brand/brand-mark";

export default function Loading() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "background.default" }}>
      <Box sx={{ position: "relative", display: "grid", placeItems: "center" }} role="status" aria-label="Chargement">
        <CircularProgress size={72} thickness={2} />
        <Box sx={{ position: "absolute" }}>
          <BrandSeal size={40} />
        </Box>
      </Box>
    </Box>
  );
}
