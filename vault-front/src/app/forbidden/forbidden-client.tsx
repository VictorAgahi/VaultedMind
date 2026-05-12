"use client";

import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import Link from "next/link";
import {
  LockOutlined as LockOutlinedIcon,
  ArrowBack as ArrowBackIcon
} from "@mui/icons-material";

export default function Forbidden() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a1a 0%, #070435 100%)",
        textAlign: "center",
        p: 3,
        color: "white"
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            p: { xs: 4, md: 8 },
            borderRadius: 8,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              bgcolor: "rgba(216, 24, 50, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              mb: 4,
              border: "2px solid rgba(216, 24, 50, 0.3)",
              animation: "pulse 2s infinite ease-in-out",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(216, 24, 50, 0.4)" },
                "70%": { transform: "scale(1.05)", boxShadow: "0 0 0 20px rgba(216, 24, 50, 0)" },
                "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(216, 24, 50, 0)" },
              }
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 60, color: "#d81832" }} />
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              mb: 2,
              letterSpacing: "-0.02em"
            }}
          >
            Accès Refusé
          </Typography>

          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)", mb: 6, fontSize: "1.1rem" }}>
            Désolé, vous n&apos;avez pas les permissions nécessaires pour accéder à cette partie du coffre-fort. 
            Ceci est une zone hautement sécurisée.
          </Typography>

          <Button
            component={Link}
            href="/dashboard"
            variant="contained"
            size="large"
            startIcon={<ArrowBackIcon />}
            sx={{
              py: 2,
              px: 4,
              borderRadius: 3,
              fontSize: "1rem",
              fontWeight: 700,
              textTransform: "none",
              bgcolor: "#d81832",
              "&:hover": {
                bgcolor: "#b01328",
                transform: "translateY(-2px)",
              },
              transition: "all 0.3s ease",
            }}
          >
            Retourner en zone sûre
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
