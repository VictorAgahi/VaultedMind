"use client";

import { useEffect } from "react";
import { useColorScheme } from "@mui/material/styles";

const THEME_COLORS = { light: "#F6F3F0", dark: "#141010" } as const;

// Aligne la couleur de la barre du navigateur (et de la barre d'état iOS) sur le mode réellement affiché,
// y compris quand l'utilisateur force Clair ou Sombre dans son profil.
export const ThemeColorSync = () => {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;

  useEffect(() => {
    if (!resolved) return;
    const color = THEME_COLORS[resolved];
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }
    metas.forEach((meta) => {
      meta.content = color;
      meta.removeAttribute("media");
    });
  }, [resolved]);

  return null;
};
