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
      }}
    >
      <BottomNavigation
        value={getValue()}
        onChange={(event, newValue) => handleChange(newValue)}
        sx={{
          bgcolor: "#ede5d9",
          borderTop: "2px solid #d81832",
          "& .MuiBottomNavigationAction-root": {
            color: "#111827",
            "&.Mui-selected": {
              color: "#d81832",
              fontWeight: 700,
            },
          },
        }}
      >
        <BottomNavigationAction icon={<DashboardIcon />} label="Dashboard" />
        <BottomNavigationAction icon={<BarChartIcon />} label="Analytics" />
        <BottomNavigationAction icon={<SettingsIcon />} label="Fields" />
        <BottomNavigationAction icon={<CloudUploadIcon />} label="Import" />
      </BottomNavigation>
    </Box>
  );
};
