"use client";

import React from "react";
import { AppBar, Toolbar, Box, Button, Avatar, IconButton, Tooltip } from "@mui/material";
import { useAuth } from "@/context/auth-context";
import LogoutIcon from "@mui/icons-material/Logout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { SETTINGS_ROUTES } from "@/components/settings/settings-routes";

const authRoutes = ["/dashboard", "/import", "/fields", "/analytics", "/profile", "/ai", "/integrations", ...SETTINGS_ROUTES];

const desktopLinks = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/analytics", label: "Analyses" },
  { href: "/ai", label: "IA" },
  { href: "/fields", label: "Champs" },
  { href: "/import", label: "Importation" },
  { href: "/integrations", label: "Intégrations" },
  { href: "/settings", label: "Paramètres" },
];

// Mobile : barre compacte (marque + avatar), la navigation vit dans la barre du bas.
// Desktop : liens texte, la page active porte une pastille douce.
export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!authRoutes.includes(pathname)) {
    return null;
  }

  const initial = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        top: "env(safe-area-inset-top, 0px)",
        bgcolor: "background.default",
        borderBottom: { xs: "none", md: 1 },
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2, minHeight: { xs: 56, md: 64 }, px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <Box component={Link} href="/dashboard" aria-label="VaultedMind, accueil" sx={{ textDecoration: "none", display: "flex" }}>
            <BrandWordmark size={30} />
          </Box>

          <Box component="nav" aria-label="Navigation principale" sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
            {desktopLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  size="small"
                  sx={{
                    color: active ? "primary.main" : "text.secondary",
                    bgcolor: active ? "primary.light" : "transparent",
                    "&:hover": { bgcolor: active ? "primary.light" : "action.hover" },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Mon profil">
            <IconButton component={Link} href="/profile" aria-label="Mon profil">
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 34, height: 34, fontSize: "0.875rem", fontWeight: 700 }}>
                {initial}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Tooltip title="Se déconnecter">
            <IconButton onClick={logout} aria-label="Se déconnecter" sx={{ display: { xs: "none", md: "inline-flex" }, color: "text.secondary" }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
