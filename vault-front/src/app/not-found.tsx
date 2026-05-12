"use client";

import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import Link from "next/link";
import {
  Home as HomeIcon,
  SentimentVeryDissatisfied as SentimentVeryDissatisfiedIcon
} from "@mui/icons-material";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
        textAlign: "center",
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            p: { xs: 4, md: 8 },
            borderRadius: 8,
            bgcolor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          }}
        >
          <SentimentVeryDissatisfiedIcon
            sx={{
              fontSize: 100,
              color: "primary.main",
              mb: 4,
              opacity: 0.8,
              animation: "pulse 2s infinite ease-in-out",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)", opacity: 0.8 },
                "50%": { transform: "scale(1.05)", opacity: 1 },
                "100%": { transform: "scale(1)", opacity: 0.8 },
              }
            }}
          />

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "5rem", md: "8rem" },
              fontWeight: 900,
              lineHeight: 1,
              mb: 2,
              background: "linear-gradient(45deg, #070435 30%, #d81832 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </Typography>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: "#1f2937" }}>
            Oups ! Page introuvable.
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", mb: 6, fontSize: "1.1rem" }}>
            Il semble que vous ayez trouvé une zone non sécurisée de votre esprit.
            Revenons à l&apos;essentiel.
          </Typography>

          <Button
            component={Link}
            href="/dashboard"
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
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
            Retour au tableau de bord
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
