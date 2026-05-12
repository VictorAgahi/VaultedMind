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
            background: "linear-gradient(135deg, #000 0%, #111 100%)",
            color: "white",
            textAlign: "center",
            p: 3,
            fontFamily: "sans-serif"
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="h2" sx={{ fontWeight: 900, mb: 2 }}>
              Erreur Critique
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", mb: 6 }}>
              Une erreur système majeure est survenue. L&apos;application a dû s&apos;arrêter pour protéger votre coffre-fort.
            </Typography>
            <Button
              onClick={() => reset()}
              variant="contained"
              size="large"
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                bgcolor: "#d81832",
                "&:hover": { bgcolor: "#b01328" }
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
