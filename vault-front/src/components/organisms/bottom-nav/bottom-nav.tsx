"use client";

import React from "react";
import { BottomNavigation, BottomNavigationAction, Box } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { usePathname, useRouter } from "next/navigation";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const authRoutes = ["/dashboard", "/import", "/fields", "/analytics"];

  if (!authRoutes.includes(pathname)) {
    return null;
  }

  const getValue = () => {
    if (pathname === "/dashboard") return 0;
    if (pathname === "/analytics") return 1;
    if (pathname === "/fields") return 2;
    if (pathname === "/import") return 3;
    return 0;
  };

  const handleChange = (newValue: number) => {
    const paths = ["/dashboard", "/analytics", "/fields", "/import"];
    router.push(paths[newValue]);
  };

  return (
    <Box
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pb: "env(safe-area-inset-bottom, 0px)",
        bgcolor: "#ede5d9",
        borderTop: "2px solid #d81832",
      }}
    >
      <BottomNavigation
        value={getValue()}
        onChange={(event, newValue) => handleChange(newValue)}
        sx={{
          bgcolor: "transparent",
          "& .MuiBottomNavigationAction-root": {
            color: "#111827",
            "&.Mui-selected": {
              color: "#d81832",
              fontWeight: 700,
            },
          },
        }}
      >
        <BottomNavigationAction icon={<DashboardIcon />} label="Accueil" />
        <BottomNavigationAction icon={<BarChartIcon />} label="Analyses" />
        <BottomNavigationAction icon={<SettingsIcon />} label="Champs" />
        <BottomNavigationAction icon={<CloudUploadIcon />} label="Importation" />
      </BottomNavigation>
    </Box>
  );
};
