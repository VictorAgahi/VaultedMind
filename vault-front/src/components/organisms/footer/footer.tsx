"use client";

import React from "react";
import { Box, Typography, Container, Divider, Link as MuiLink } from "@mui/material";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: "auto",
        backgroundColor: (theme) =>
          theme.palette.mode === "light"
            ? theme.palette.grey[50]
            : theme.palette.grey[900],
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            mb: 4,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "primary.main",
              textDecoration: "none",
            }}
            component={Link}
            href="/"
          >
            VaultedMind
          </Typography>
          
          <Box sx={{ display: "flex", gap: 3 }}>
            <MuiLink component={Link} href="/privacy" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Privacy Policy
            </MuiLink>
            <MuiLink component={Link} href="/terms" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Terms of Service
            </MuiLink>
            <MuiLink component={Link} href="/contact" color="text.secondary" variant="body2" sx={{ textDecoration: "none" }}>
              Contact
            </MuiLink>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        <Typography variant="body2" color="text.secondary" align="center">
          {"Copyright © "}
          VaultedMind {new Date().getFullYear()}
          {" - Secure Your Mental Well-being."}
        </Typography>
      </Container>
    </Box>
  );
};
