"use client";

import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";

export const ThemeModeSwitch: React.FC = () => {
  const { mode, setMode } = useColorScheme();

  return (
    <ToggleButtonGroup
      value={mode ?? "system"}
      exclusive
      fullWidth
      aria-label="Thème de l'application"
      onChange={(_, value) => value && setMode(value)}
      sx={{
        p: 0.5,
        gap: 0.5,
        borderRadius: 999,
        bgcolor: "action.hover",
        "& .MuiToggleButton-root": {
          border: 0,
          borderRadius: "999px !important",
          minHeight: 40,
          gap: 0.75,
          fontWeight: 700,
          textTransform: "none",
          color: "text.secondary",
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "background.paper",
          color: "text.primary",
          boxShadow: "0 1px 2px rgba(15, 20, 19, 0.12)",
          "&:hover": { bgcolor: "background.paper" },
        },
      }}
    >
      <ToggleButton value="system"><BrightnessAutoIcon fontSize="small" />Auto</ToggleButton>
      <ToggleButton value="light"><LightModeOutlinedIcon fontSize="small" />Clair</ToggleButton>
      <ToggleButton value="dark"><DarkModeOutlinedIcon fontSize="small" />Sombre</ToggleButton>
    </ToggleButtonGroup>
  );
};
