"use client";

import React from "react";
import Link from "next/link";
import { Box, ButtonBase, Container, Typography } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { InsightsPanel } from "@/components/ai-insights/insights-panel";
import { CrisisResources } from "@/components/support/crisis-resources";
import { Navbar } from "@/components/navbar/navbar";

export default function AIClient() {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
            Espace IA
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 600 }}>
            Vos bilans personnalisés et un assistant pour poser vos questions.
          </Typography>
        </Box>

        <ButtonBase
          component={Link}
          href="/ai/chat"
          sx={{
            width: "100%",
            justifyContent: "flex-start",
            gap: 2,
            p: 2,
            mb: 2,
            borderRadius: 4,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            textAlign: "left",
          }}
        >
          <Box sx={{ width: 44, height: 44, flex: "none", borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "rgba(var(--mui-palette-primary-contrastTextChannel) / 0.16)" }}>
            <ChatBubbleOutlineRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>Parler à l&apos;assistant</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>Posez une question sur vos journaux</Typography>
          </Box>
          <ChevronRightIcon />
        </ButtonBase>

        <InsightsPanel />

        <Box sx={{ mt: 2 }}>
          <CrisisResources />
        </Box>
      </Container>
    </Box>
  );
}
