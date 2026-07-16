"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Fade,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatIcon from "@mui/icons-material/Chat";
import { Navbar } from "@/components/navbar/navbar";
import { InsightsPanel } from "@/components/ai-insights/insights-panel";
import { AIChatInline } from "@/components/ai-insights/ai-chat-inline";

export default function AIClient() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 3, md: 5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <AutoAwesomeIcon
              sx={{
                fontSize: { xs: "1.6rem", sm: "2rem" },
                color: "#6366f1",
                filter: "drop-shadow(0 2px 4px rgba(99,102,241,0.3))",
              }}
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "1.6rem", sm: "2rem", md: "2.4rem" },
                color: "#142949",
                letterSpacing: "-0.02em",
              }}
            >
              Intelligence Artificielle
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              maxWidth: 600,
            }}
          >
            Vos analyses personnalisées, prédictions et assistant intelligent.
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            mb: 3,
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 700,
                py: 2,
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                textTransform: "none",
                gap: 1,
              },
              "& .Mui-selected": { color: "#6366f1" },
              "& .MuiTabs-indicator": {
                backgroundColor: "#6366f1",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            <Tab
              icon={<AutoAwesomeIcon sx={{ fontSize: "1.1rem" }} />}
              iconPosition="start"
              label="Analyses & Prédictions"
            />
            <Tab
              icon={<ChatIcon sx={{ fontSize: "1.1rem" }} />}
              iconPosition="start"
              label="Assistant IA"
            />
          </Tabs>
        </Paper>

        {/* Tab content */}
        <Box sx={{ minHeight: 400 }}>
          {tabValue === 0 && (
            <Fade in={tabValue === 0} timeout={300}>
              <Box>
                <InsightsPanel />
              </Box>
            </Fade>
          )}

          {tabValue === 1 && (
            <Fade in={tabValue === 1} timeout={300}>
              <Box>
                <AIChatInline />
              </Box>
            </Fade>
          )}
        </Box>
      </Container>
    </Box>
  );
}
