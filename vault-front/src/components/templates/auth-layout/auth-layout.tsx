"use client";

import React, { ReactNode } from "react";
import { Box, Typography, Container, Grid, useTheme, useMediaQuery } from "@mui/material";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Grid container>
        {!isMobile && (
          <Grid size={{ lg: 6 }} sx={{ position: "relative" }}>
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 8,
                background: "linear-gradient(135deg, #d81832 0%, #c2152a 100%)",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=2564&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.2,
                  mixBlendMode: "overlay",
                }
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1, color: "white", maxWidth: 500 }}>
                <Typography variant="h1" sx={{ fontSize: "3.5rem", mb: 3 }}>
                  VaultedMind
                </Typography>
                <Typography variant="h5" sx={{ fontStyle: "italic", color: "#070435", lineHeight: 1.6 }}>
                  &quot;The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.&quot;
                </Typography>
              </Box>
            </Box>
          </Grid>
        )}
        <Grid
          size={{ xs: 12, lg: 6 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3
          }}
        >
          <Container maxWidth="sm">
            {children}
          </Container>
        </Grid>
      </Grid>
    </Box>
  );
};
