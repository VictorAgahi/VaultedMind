"use client";

import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import { DailyLogsManager } from "@/components/daily-logs-manager/daily-logs-manager";
import { LatestAIReviewCard } from "@/components/dashboard/latest-ai-review-card";
import Link from "next/link";
import { Navbar } from "@/components/navbar/navbar";
import { useAuth } from "@/context/auth-context";
import { useCurrentTime } from "@/utils/use-current-time";

const greeting = (hour: number) => (hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour");

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const now = useCurrentTime();

  if (loading) {
    return (
      <Stack sx={{ height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
          <Typography suppressHydrationWarning variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
            {greeting(now ? new Date(now).getHours() : 12)}{user.firstName ? `, ${user.firstName}` : ""}
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gap: 1.5 }}>
          <DailyLogsManager />
          <LatestAIReviewCard />
          {user.preferences?.insightsV2Enabled && (
            <Paper component="section" aria-labelledby="levers-entry-title" sx={{ p: 2.5, borderRadius: 4, display: "grid", gap: 1 }}>
              <Typography id="levers-entry-title" variant="h5" component="h2">Mes leviers</Typography>
              <Typography variant="body2" color="text.secondary">
                Ce qui semble t&apos;aider et ce qui pèse, repéré dans tes propres données.
              </Typography>
              <Button component={Link} href="/analytics?tab=leviers" variant="outlined" sx={{ justifySelf: "start" }}>
                Voir mes leviers
              </Button>
            </Paper>
          )}
        </Box>
      </Container>
    </Box>
  );
}
