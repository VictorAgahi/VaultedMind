"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
} from "@mui/material";
import { Navbar } from "@/components/navbar/navbar";
import { CustomFieldsManager } from "@/components/custom-fields-manager/custom-fields-manager";

export default function FieldsPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Champs personnalisés
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Créez et gérez vos propres champs de suivi et leur ordre d&apos;affichage.
          </Typography>
        </Box>

        <CustomFieldsManager />
      </Container>
    </Box>
  );
}
