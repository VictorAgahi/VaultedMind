"use client";

import React, { useEffect } from "react";
import { Box, Typography, Button, Container, Stack } from "@mui/material";
import Link from "next/link";
import {
  Refresh as RefreshIcon,
  Home as HomeIcon,
  ErrorOutlined as ErrorOutlineIcon
} from "@mui/icons-material";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fff5f5 0%, #fff 100%)",
        textAlign: "center",
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            p: { xs: 4, md: 8 },
            borderRadius: 8,
            bgcolor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(216, 24, 50, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(216, 24, 50, 0.1)",
          }}
        >
          <ErrorOutlineIcon
            sx={{
              fontSize: 100,
              color: "primary.main",
              mb: 4,
              opacity: 0.8,
              animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
              "@keyframes shake": {
                "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
                "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
                "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
                "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
              }
            }}
          />

          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              mb: 2,
              color: "#111827",
            }}
          >
            Quelque chose s&apos;est mal passé
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", mb: 6, fontSize: "1.1rem" }}>
            Une erreur inattendue est survenue dans votre coffre-fort numérique.
            Ne vous inquiétez pas, vos données restent en sécurité.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
            <Button
              onClick={() => reset()}
              variant="contained"
              size="large"
              startIcon={<RefreshIcon />}
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                fontSize: "1rem",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 10px 15px -3px rgba(216, 24, 50, 0.3)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 20px 25px -5px rgba(216, 24, 50, 0.4)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Réessayer
            </Button>

            <Button
              component={Link}
              href="/"
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                fontSize: "1rem",
                fontWeight: 700,
                textTransform: "none",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  transform: "translateY(-2px)",
                  bgcolor: "rgba(0,0,0,0.02)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Retour à l&apos;accueil
            </Button>
          </Stack>

          {process.env.NODE_ENV === "development" && (
            <Typography variant="caption" sx={{ mt: 4, display: "block", color: "error.main", opacity: 0.6 }}>
              Error: {error.message}
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}
