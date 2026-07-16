"use client";

import {
  Box,
  Typography,
  Container,
  Grid,
  CircularProgress,
  Stack,
} from "@mui/material";
import { DailyLogsManager } from "@/components/daily-logs-manager/daily-logs-manager";
import { WellnessScoreCard } from "@/components/dashboard/wellness-score-card";
import { Navbar } from "@/components/navbar/navbar";
import { useAuth } from "@/context/auth-context";

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
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800, fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" } }}>
            Tableau de bord
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Bienvenue{user.firstName ? `, ${user.firstName}` : ""}.
          </Typography>
        </Box>

        {/* Wellness Score Card — spectacular feature */}
        <WellnessScoreCard />

        <Grid container spacing={0}>
          <Grid size={{ xs: 12 }}>
            <DailyLogsManager />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
