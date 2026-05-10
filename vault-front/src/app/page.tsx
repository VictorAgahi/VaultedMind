"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Stack
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";

import Image from "next/image";

export default function Home() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ py: 1 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Image src="/assets/logo.png" alt="VaultedMind Logo" width={32} height={32} priority unoptimized />
              <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                VaultedMind
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button component={Link} href="/login" color="inherit">
                Login
              </Button>
              <Button component={Link} href="/register" variant="contained">
                Get Started
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <main>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 15 } }}>
          <Grid container spacing={4} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h1" sx={{ fontSize: { xs: "3rem", md: "4.5rem" }, mb: 3 }}>
                Secure Your <Box component="span" sx={{ color: "primary.main" }}>Mind</Box>.
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 5, lineHeight: 1.6, maxWidth: 600 }}>
                VaultedMind is a state-of-the-art encryption platform for your most personal thoughts,
                health records, and digital legacy. Built for privacy, designed for peace of mind.
              </Typography>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                sx={{ py: 2, px: 4, fontSize: "1.1rem" }}
              >
                Initialize Your Vault
              </Button>
            </Grid>
          </Grid>
        </Container>

        <Box sx={{ py: 12 }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <ShieldIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      End-to-End Encryption
                    </Typography>
                    <Typography color="text.secondary">
                      Your data is encrypted before it even leaves your device. Only you hold the key.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <AnalyticsIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Mental Health Tracking
                    </Typography>
                    <Typography color="text.secondary">
                      Advanced analytics to help you understand your emotional patterns over time.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%", boxShadow: "none", bgcolor: "background.default" }}>
                  <CardContent sx={{ p: 4 }}>
                    <HistoryEduIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                      Digital Inheritance
                    </Typography>
                    <Typography color="text.secondary">
                      Securely pass your digital legacy to loved ones with our &quot;Dead Man&apos;s Switch&quot; technology.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </main>

      <Box component="footer" sx={{ py: 6, textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          &copy; 2024 VaultedMind. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
