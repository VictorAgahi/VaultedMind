"use client";

import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Stack,
} from "@mui/material";
import { DailyLogsManager } from "@/components/daily-logs-manager/daily-logs-manager";
import { LatestAIReviewCard } from "@/components/dashboard/latest-ai-review-card";
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
        </Box>
      </Container>
    </Box>
  );
}
