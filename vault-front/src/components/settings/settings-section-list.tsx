"use client";

import React from "react";
import Link from "next/link";
import { Box, List, ListItemButton, ListItemText, Paper } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { settingsHref } from "./settings-routes";
import { SETTINGS_SECTIONS } from "./settings-sections";

// Liste des sections : chaque ligne ouvre une vue dédiée.
export const SettingsSectionList: React.FC = () => (
  <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
    <List disablePadding aria-label="Sections des paramètres">
      {SETTINGS_SECTIONS.map(({ id, title, hint, icon: Icon }, index) => (
        <ListItemButton
          key={id}
          component={Link}
          href={settingsHref(id)}
          divider={index < SETTINGS_SECTIONS.length - 1}
          sx={{ minHeight: 64, px: 2, gap: 1.5 }}
        >
          <Box
            aria-hidden
            sx={{ width: 40, height: 40, flex: "none", borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "primary.light", color: "primary.main" }}
          >
            <Icon fontSize="small" />
          </Box>
          <ListItemText
            primary={title}
            secondary={hint}
            slotProps={{ primary: { sx: { fontWeight: 700 } }, secondary: { noWrap: true } }}
            sx={{ minWidth: 0 }}
          />
          <ChevronRightIcon sx={{ color: "text.disabled", flex: "none" }} />
        </ListItemButton>
      ))}
    </List>
  </Paper>
);
