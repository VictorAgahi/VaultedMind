"use client";

import { Box, CircularProgress, Typography, Container } from "@mui/material";

export default function Loading() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Container maxWidth="xs" sx={{ textAlign: "center" }}>
        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
            mb: 4
          }}
        >
          <CircularProgress
            size={80}
            thickness={2}
            sx={{
              color: "primary.main",
              animationDuration: "1.5s",
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src="/manifest-icon-192.maskable.png"
              alt="VaultedMind"
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                opacity: 0.8,
                animation: "pulse 2s infinite ease-in-out",
                "@keyframes pulse": {
                  "0%": { transform: "scale(0.9)", opacity: 0.5 },
                  "50%": { transform: "scale(1.1)", opacity: 0.8 },
                  "100%": { transform: "scale(0.9)", opacity: 0.5 },
                }
              }}
              onError={(e) => {
                // Fallback if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </Box>
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "text.primary",
            letterSpacing: "0.05em",
            animation: "fadeInOut 2s infinite",
            "@keyframes fadeInOut": {
              "0%": { opacity: 0.5 },
              "50%": { opacity: 1 },
              "100%": { opacity: 0.5 },
            }
          }}
        >
          Ouverture du coffre-fort…
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, opacity: 0.7 }}>
          Sécurisation de votre espace personnel
        </Typography>
      </Container>
    </Box>
  );
}
