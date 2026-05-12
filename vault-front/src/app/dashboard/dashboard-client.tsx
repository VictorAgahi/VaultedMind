"use client";

import {
  Box,
  Typography,
  Container,
  Grid
} from "@mui/material";
import { DailyLogsManager } from "@/components/daily-logs-manager/daily-logs-manager";
import { InsightsPanel } from "@/components/ai-insights/insights-panel";
import { Navbar } from "@/components/navbar/navbar";
import { useAuth } from "@/context/auth-context";
import { CircularProgress, Stack } from "@mui/material";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Stack
        sx={{
          height: "100vh",
          bgcolor: "#ede5d9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (!user) {
    return null;
  }

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

        <Grid size={{ xs: 12 }}>
          <InsightsPanel />
        </Grid>
      </Container>
    </Box>
  );
}
