"use client";

import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar/navbar";
import { sectionById } from "@/components/settings/settings-sections";
import type { SettingsSectionId } from "@/components/settings/settings-routes";

export default function SettingsSectionClient({ section }: { section: SettingsSectionId }) {
  const { user } = useAuth();
  if (!user) return null;
  const { title, Content } = sectionById(section);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, sm: 3 }, display: "grid", gap: 1.5 }}>
        <Button component={Link} href="/settings" startIcon={<ArrowBackRoundedIcon />} color="inherit" size="small" sx={{ justifySelf: "start", color: "text.secondary", ml: -1 }}>
          Paramètres
        </Button>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, mb: 0.5 }}>
          {title}
        </Typography>
        <Content />
      </Container>
    </Box>
  );
}
