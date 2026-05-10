"use client";

import React from "react";
import { AppBar, Toolbar, Typography, Box, Button, Avatar } from "@mui/material";
import { useAuth } from "@/context/auth-context";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Image from "next/image";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <AppBar position="static" color="inherit" elevation={1}>
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 8 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
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
              Dashboard
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
              Analytics
            </Button>
            <Button
              component={Link}
              href="/import"
              color={pathname === "/import" ? "primary" : "inherit"}
              variant={pathname === "/import" ? "contained" : "text"}
              disableElevation
              sx={{ borderRadius: 2 }}
            >
              Import CSV
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
              Fields
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
            Welcome, <strong>{user?.email || "User"}</strong>
          </Typography>
          <Avatar sx={{ bgcolor: "primary.light", width: 32, height: 32 }}>
            {user?.email?.[0].toUpperCase() || "U"}
          </Avatar>
          <Button
            variant="outlined"
            size="small"
            onClick={logout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
