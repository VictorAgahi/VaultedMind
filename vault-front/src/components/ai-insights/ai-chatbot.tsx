"use client";

import React from "react";
import Link from "next/link";
import { Fab, Tooltip } from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { usePathname } from "next/navigation";

const appRoutes = ["/dashboard", "/import", "/fields", "/analytics", "/profile", "/integrations"];

// Raccourci vers l'assistant en plein écran, sur grand écran uniquement :
// sur mobile, l'assistant est dans l'onglet IA de la barre du bas.
export function AIChatBot() {
  const pathname = usePathname();
  if (!appRoutes.includes(pathname)) return null;

  return (
    <Tooltip title="Ouvrir l'assistant" placement="left">
      <Fab
        component={Link}
        href="/ai/chat"
        color="primary"
        aria-label="Ouvrir l'assistant"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1100,
          display: { xs: "none", md: "flex" },
        }}
      >
        <ChatBubbleOutlineRoundedIcon />
      </Fab>
    </Tooltip>
  );
}
