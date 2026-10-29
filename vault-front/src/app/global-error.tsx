"use client";

import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#0F1413",
            color: "#E8EEEB",
            textAlign: "center",
            p: 3,
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
              L&apos;application s&apos;est arrêtée
            </Typography>
            <Typography variant="body1" sx={{ color: "#A3B0AB", mb: 4 }}>
              Une erreur grave est survenue. L&apos;application s&apos;est arrêtée pour protéger votre carnet. Vos données ne sont pas perdues.
            </Typography>
            <Button
              onClick={() => reset()}
              variant="contained"
              size="large"
              sx={{
                minHeight: 52,
                px: 4,
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#6CC3B3",
                color: "#0F1413",
                "&:hover": { bgcolor: "#86D1C3" }
              }}
            >
              Relancer l&apos;application
            </Button>
            {process.env.NODE_ENV === "development" && (
              <Box sx={{ mt: 4, p: 2, bgcolor: "rgba(255,0,0,0.1)", borderRadius: 2, textAlign: "left" }}>
                <code>{error.message}</code>
              </Box>
            )}
          </Container>
        </Box>
      </body>
    </html>
  );
}
