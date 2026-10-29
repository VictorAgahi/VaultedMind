"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Fade,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatIcon from "@mui/icons-material/Chat";
import { CrisisResources } from "@/components/support/crisis-resources";
import { Navbar } from "@/components/navbar/navbar";
import { InsightsPanel } from "@/components/ai-insights/insights-panel";
import { AIChatInline } from "@/components/ai-insights/ai-chat-inline";

export default function AIClient() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--mui-palette-background-default)" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
            Assistant IA
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 600 }}>
            Vos bilans personnalisés et un assistant pour poser vos questions.
          </Typography>
        </Box>

        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          aria-label="Espace IA"
          sx={{
            mb: 2,
            p: 0.5,
            minHeight: 52,
            borderRadius: 999,
            bgcolor: "action.hover",
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTab-root": { minHeight: 44, minWidth: 0, py: 0.5, borderRadius: 999, gap: 0.75, color: "text.secondary" },
            "& .MuiTab-root.Mui-selected": { bgcolor: "background.paper", color: "text.primary", boxShadow: "0 1px 2px rgba(15, 20, 19, 0.12)" },
          }}
        >
          <Tab icon={<AutoAwesomeIcon sx={{ fontSize: "1.1rem" }} />} iconPosition="start" label="Bilans" />
          <Tab icon={<ChatIcon sx={{ fontSize: "1.1rem" }} />} iconPosition="start" label="Assistant" />
        </Tabs>

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

        <Box sx={{ mt: 2 }}>
          <CrisisResources />
        </Box>
      </Container>
    </Box>
  );
}
