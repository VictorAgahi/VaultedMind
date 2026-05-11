"use client";

import {
  Box,
  Typography,
  Container,
  Grid
} from "@mui/material";
import { DailyLogsManager } from "@/components/daily-logs-manager/daily-logs-manager";
import { Navbar } from "@/components/navbar/navbar";

export default function DashboardPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Votre tableau de bord sécurisé
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Ceci est une zone protégée. Seuls les utilisateurs authentifiés peuvent voir ceci.
          </Typography>
        </Box>

        <Grid size={{ xs: 12 }}>
          <DailyLogsManager />
        </Grid>
      </Container>
    </Box>
  );
}
