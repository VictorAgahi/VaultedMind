"use client";

import React from "react";
import Link from "next/link";
import { Box, ButtonBase, Typography } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import PersonIcon from "@mui/icons-material/Person";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { usePathname, useRouter } from "next/navigation";
import { SETTINGS_ROUTES } from "@/components/settings/settings-routes";

export const BOTTOM_NAV_HEIGHT = 72;

// Événement écouté par le gestionnaire du journal pour ouvrir la saisie du jour.
export const NEW_ENTRY_EVENT = "vault:new-entry";

const authRoutes = ["/dashboard", "/import", "/fields", "/analytics", "/profile", "/ai", "/integrations", ...SETTINGS_ROUTES];

const tabs = [
  { href: "/dashboard", label: "Accueil", icon: HomeOutlinedIcon, activeIcon: HomeIcon, match: ["/dashboard"] },
  { href: "/analytics", label: "Analyses", icon: InsightsOutlinedIcon, activeIcon: InsightsIcon, match: ["/analytics"] },
  { href: "/ai", label: "IA", icon: AutoAwesomeOutlinedIcon, activeIcon: AutoAwesomeIcon, match: ["/ai"] },
  { href: "/profile", label: "Profil", icon: PersonOutlineIcon, activeIcon: PersonIcon, match: ["/profile", "/fields", "/import", "/integrations", ...SETTINGS_ROUTES] },
];

const NavItem: React.FC<{ tab: (typeof tabs)[number]; active: boolean }> = ({ tab, active }) => {
  const Icon = active ? tab.activeIcon : tab.icon;
  return (
    <ButtonBase
      component={Link}
      href={tab.href}
      aria-current={active ? "page" : undefined}
      sx={{
        flexDirection: "column",
        gap: 0.25,
        minHeight: 56,
        borderRadius: 3,
        color: active ? "primary.main" : "text.secondary",
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 30,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          bgcolor: active ? "primary.light" : "transparent",
          transition: "background-color 160ms cubic-bezier(.2,0,0,1)",
        }}
      >
        <Icon sx={{ fontSize: 24 }} />
      </Box>
      <Typography component="span" sx={{ fontSize: "0.6875rem", fontWeight: 700, lineHeight: 1.2 }}>
        {tab.label}
      </Typography>
    </ButtonBase>
  );
};

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { push } = useRouter();

  if (!authRoutes.includes(pathname)) {
    return null;
  }

  const isActive = (tab: (typeof tabs)[number]) => tab.match.includes(pathname);

  const handleNewEntry = () => {
    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent(NEW_ENTRY_EVENT));
    } else {
      push("/dashboard?new=1");
    }
  };

  return (
    <>
      {/* Réserve l'espace sous le contenu pour que la barre fixe ne masque rien */}
      <Box aria-hidden sx={{ display: { xs: "block", md: "none" }, height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }} />
      <Box
        component="nav"
        aria-label="Navigation principale"
        sx={{
          display: { xs: "grid", md: "none" },
          gridTemplateColumns: "repeat(5, 1fr)",
          alignItems: "center",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          minHeight: BOTTOM_NAV_HEIGHT,
          px: 1,
          pt: 0.75,
          pb: "max(8px, env(safe-area-inset-bottom, 0px))",
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <NavItem tab={tabs[0]} active={isActive(tabs[0])} />
        <NavItem tab={tabs[1]} active={isActive(tabs[1])} />
        <Box sx={{ display: "grid", placeItems: "center" }}>
          <ButtonBase
            onClick={handleNewEntry}
            aria-label="Noter ma journée"
            sx={{
              width: 56,
              height: 56,
              mt: -3,
              borderRadius: "18px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              boxShadow: "0 6px 16px rgba(20, 16, 16, 0.25)",
              transition: "transform 160ms cubic-bezier(.2,0,0,1)",
              "&:active": { transform: "scale(0.94)" },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 30 }} />
          </ButtonBase>
        </Box>
        <NavItem tab={tabs[2]} active={isActive(tabs[2])} />
        <NavItem tab={tabs[3]} active={isActive(tabs[3])} />
      </Box>
    </>
  );
};
