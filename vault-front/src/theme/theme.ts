"use client";

import { createTheme } from "@mui/material/styles";

// Charte "Le carnet scellé" : encre profonde (primary), lueur ambrée (secondary, usage rare),
// neutres teintés de vert. Les valeurs sombres sont choisies, pas inversées.
// Les tokens graphiques (séries, divergente, axes) vivent dans globals.css et chart-tokens.ts.

const DISPLAY_FONT = 'var(--font-display), "Avenir Next", "Segoe UI", system-ui, sans-serif';
const BODY_FONT = 'var(--font-body), system-ui, -apple-system, "Segoe UI", sans-serif';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1E5B53", dark: "#174943", light: "#DCEDE8", contrastText: "#FFFFFF" },
        secondary: { main: "#F2B544", dark: "#D99A22", light: "#FBE7BF", contrastText: "#17201D" },
        success: { main: "#2E7D4F", contrastText: "#FFFFFF" },
        warning: { main: "#8A5A00", contrastText: "#FFFFFF" },
        error: { main: "#B3261E", contrastText: "#FFFFFF" },
        info: { main: "#2D5DA8", contrastText: "#FFFFFF" },
        background: { default: "#F3F4F1", paper: "#FFFFFF" },
        text: { primary: "#17201D", secondary: "#4E5A55", disabled: "#6B7672" },
        divider: "#D8DDD8",
        action: { hover: "rgba(23, 32, 29, 0.05)", selected: "rgba(30, 91, 83, 0.10)" },
        grey: { 100: "#E9ECE7", 200: "#D8DDD8" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#6CC3B3", dark: "#86D1C3", light: "#1E3A35", contrastText: "#0F1413" },
        secondary: { main: "#E8B04B", dark: "#F0C470", light: "#3A2E17", contrastText: "#0F1413" },
        success: { main: "#7FD1A0", contrastText: "#0F1413" },
        warning: { main: "#E8B04B", contrastText: "#0F1413" },
        error: { main: "#F2B8B5", contrastText: "#0F1413" },
        info: { main: "#9DB8F0", contrastText: "#0F1413" },
        background: { default: "#0F1413", paper: "#171D1C" },
        text: { primary: "#E8EEEB", secondary: "#A3B0AB", disabled: "#7D8A85" },
        divider: "#2B3533",
        action: { hover: "rgba(232, 238, 235, 0.06)", selected: "rgba(108, 195, 179, 0.14)" },
        grey: { 100: "#1F2725", 200: "#2B3533" },
      },
    },
  },
  // Base 4px : borderRadius 2 = 8px (sm), 4 = 16px (md). Les composants clés fixent leur rayon en px.
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: BODY_FONT,
    fontWeightBold: 700,
    h1: { fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: "2rem", lineHeight: 1.05, letterSpacing: "-0.03em" },
    h2: { fontFamily: DISPLAY_FONT, fontWeight: 650, fontSize: "1.5rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
    h3: { fontFamily: DISPLAY_FONT, fontWeight: 650, fontSize: "1.375rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
    h4: { fontFamily: DISPLAY_FONT, fontWeight: 650, fontSize: "1.25rem", lineHeight: 1.3 },
    h5: { fontFamily: DISPLAY_FONT, fontWeight: 650, fontSize: "1.125rem", lineHeight: 1.3 },
    h6: { fontWeight: 700, fontSize: "1.0625rem", lineHeight: 1.4 },
    subtitle1: { fontWeight: 700, fontSize: "1rem" },
    subtitle2: { fontWeight: 700, fontSize: "0.875rem" },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.45 },
    caption: { fontSize: "0.75rem", lineHeight: 1.35 },
    overline: { fontSize: "0.8125rem", fontWeight: 700, letterSpacing: 0, lineHeight: 1.4, textTransform: "none" },
    button: { textTransform: "none", fontWeight: 700, fontSize: "0.9375rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitTapHighlightColor: "transparent" },
        "input, textarea, select": { fontSize: 16 },
      },
    },
    // ButtonBase retire l'outline : on rend le focus clavier visible partout (WCAG 2.4.7).
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focusVisible": { outline: `2px solid ${theme.vars.palette.primary.main}`, outlineOffset: 2 },
        }),
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 999, paddingInline: 20 },
        sizeSmall: { minHeight: 40, paddingInline: 14 },
        sizeLarge: { minHeight: 52, paddingInline: 24, fontSize: "1rem" },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
    },
    MuiFab: {
      styleOverrides: { root: { borderRadius: 18, boxShadow: "0 6px 16px rgba(15, 20, 19, 0.25)" } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", fullWidth: true, margin: "normal" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          backgroundColor: theme.vars.palette.grey[100],
          "& fieldset": { borderColor: "transparent" },
          "&:hover fieldset": { borderColor: theme.vars.palette.divider },
          "&.Mui-focused fieldset": { borderColor: theme.vars.palette.primary.main, borderWidth: 2 },
        }),
        input: { fontSize: 16 },
      },
    },
    MuiInputBase: {
      styleOverrides: { input: { fontSize: 16 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 999, fontWeight: 700 } },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: ({ theme }) => ({ height: 3, borderRadius: 3, backgroundColor: theme.vars.palette.primary.main }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 44,
          fontWeight: 700,
          textTransform: "none",
          "&.Mui-selected": { color: theme.vars.palette.text.primary },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        // Sous 600px, tout dialogue non plein écran devient une feuille qui monte du bas.
        container: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: { alignItems: "flex-end" },
        }),
        paper: ({ theme }) => ({
          borderRadius: 28,
          backgroundImage: "none",
          [theme.breakpoints.down("sm")]: {
            "&:not(.MuiDialog-paperFullScreen)": {
              margin: 0,
              width: "100%",
              maxWidth: "100%",
              maxHeight: "92dvh",
              borderRadius: "28px 28px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            },
          },
        }),
        paperFullScreen: { borderRadius: 0 },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        head: ({ theme }) => ({
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: theme.vars.palette.text.secondary,
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.vars.palette.text.primary,
          color: theme.vars.palette.background.default,
          fontSize: "0.75rem",
          borderRadius: 8,
          padding: "6px 10px",
        }),
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
  },
});

export const displayFont = DISPLAY_FONT;
