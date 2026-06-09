"use client";

import React from "react";
import { AppBar, Toolbar, Typography, Box, Button, Avatar } from "@mui/material";
import { useAuth } from "@/context/auth-context";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonIcon from "@mui/icons-material/Person";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Image from "next/image";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const authRoutes = ["/dashboard", "/import", "/fields", "/analytics", "/profile"];

  if (!authRoutes.includes(pathname)) {
    return null;
  }

  return (
    <AppBar position="static" color="inherit" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 8 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 4 } }}>
          <Box component={Link} href="/dashboard" sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none" }}>
            <Image src="/assets/logo.png" alt="VaultedMind Logo" width={40} height={40} priority />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", letterSpacing: "-0.02em" }}>
              VaultedMind
            </Typography>
          </Box>

          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
            <Button
              component={Link}
              href="/dashboard"
              color={pathname === "/dashboard" ? "primary" : "inherit"}
              variant={pathname === "/dashboard" ? "contained" : "text"}
              startIcon={<DashboardIcon />}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Accueil
            </Button>
            <Button
              component={Link}
              href="/analytics"
              color={pathname === "/analytics" ? "primary" : "inherit"}
              variant={pathname === "/analytics" ? "contained" : "text"}
              startIcon={<BarChartIcon />}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Analyses
            </Button>
            <Button
              component={Link}
              href="/fields"
              color={pathname === "/fields" ? "primary" : "inherit"}
              variant={pathname === "/fields" ? "contained" : "text"}
              startIcon={<SettingsIcon />}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Champs
            </Button>
            <Button
              component={Link}
              href="/import"
              color={pathname === "/import" ? "primary" : "inherit"}
              variant={pathname === "/import" ? "contained" : "text"}
              startIcon={<CloudUploadIcon />}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Importation
            </Button>
            <Button
              component={Link}
              href="/profile"
              color={pathname === "/profile" ? "primary" : "inherit"}
              variant={pathname === "/profile" ? "contained" : "text"}
              startIcon={<PersonIcon />}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Profil
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 3 } }}>
          <Box component={Link} href="/profile" sx={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
            <Typography
              variant="body2"
              sx={{
                display: { xs: "none", sm: "block" },
                maxWidth: { sm: 180, md: 280 },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Bienvenue, <strong>{user?.email || "Utilisateur"}</strong>
            </Typography>
            <Avatar sx={{ bgcolor: "primary.light", width: 32, height: 32 }}>
              {user?.email?.[0].toUpperCase() || "U"}
            </Avatar>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={logout}
            startIcon={<LogoutIcon sx={{ display: { xs: "none", sm: "inline-flex" } }} />}
            sx={{ minWidth: { xs: 36, sm: "auto" }, px: { xs: 1, sm: 1.5 } }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Déconnexion</Box>
            <LogoutIcon sx={{ display: { xs: "inline-flex", sm: "none" }, fontSize: 18 }} />
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
