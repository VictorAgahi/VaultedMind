"use client";

import {
  Box,
  Typography,
  Container,
  Grid
} from "@mui/material";
import { DailyLogsManager } from "@/components/organisms/daily-logs-manager/daily-logs-manager";
import { Navbar } from "@/components/organisms/navbar/navbar";

export default function DashboardPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Your Secure Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            This is a protected area. Only authenticated users can see this.
          </Typography>
        </Box>

        <Grid size={{ xs: 12 }}>
          <DailyLogsManager />
        </Grid>
      </Container>
    </Box>
  );
}
