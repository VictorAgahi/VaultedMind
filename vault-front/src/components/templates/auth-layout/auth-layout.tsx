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
                background: "linear-gradient(135deg, #070435 0%, #d81832 100%)",
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
                  opacity: 0.3,
                  mixBlendMode: "overlay",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: "-20%",
                  right: "-20%",
                  width: "60%",
                  height: "60%",
                  background: "radial-gradient(circle, rgba(216, 24, 50, 0.4) 0%, rgba(216, 24, 50, 0) 70%)",
                  filter: "blur(60px)",
                  zIndex: 0,
                }
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1, color: "white", maxWidth: 500 }}>
                <Typography variant="h1" sx={{ 
                  fontSize: "4rem", 
                  mb: 3, 
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  textShadow: "0 10px 30px rgba(0,0,0,0.3)"
                }}>
                  VaultedMind
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontStyle: "italic", 
                  color: "rgba(255,255,255,0.8)", 
                  lineHeight: 1.6,
                  fontWeight: 300,
                  letterSpacing: "0.01em"
                }}>
                  &quot;The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.&quot;
                </Typography>
                <Box sx={{ 
                  mt: 4, 
                  width: 60, 
                  height: 4, 
                  bgcolor: "primary.main",
                  borderRadius: 2
                }} />
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
