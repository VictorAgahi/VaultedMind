"use client";

import React from "react";
import Link from "next/link";
import { Alert, Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Paper } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LinkIcon from "@mui/icons-material/Link";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { apiService } from "@/services/api.service";
import { SettingsBlock } from "./settings-block";

const getExportFilename = () => `vaultedmind-data-export-${new Date().toISOString().split("T")[0]}.json`;

const ENTRIES = [
  { href: "/fields", label: "Mes champs", hint: "Ce que vous suivez chaque jour", icon: TuneIcon },
  { href: "/integrations", label: "Apple Santé et intégrations", hint: "Synchronisation, clés d'API", icon: LinkIcon },
  { href: "/import", label: "Importer des données", hint: "Fichier CSV", icon: CloudUploadIcon },
  { href: "/export", label: "Exporter pour mon thérapeute", hint: "Document à imprimer ou en PDF", icon: DescriptionOutlinedIcon },
];

export const DataSettings: React.FC = () => {
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const exportJson = async () => {
    setError(null);
    setExporting(true);
    try {
      const data = await apiService.get("/auth/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getExportFilename();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError("Échec de l'exportation des données.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
        <List disablePadding aria-label="Mes données">
          {ENTRIES.map(({ href, label, hint, icon: Icon }) => (
            <ListItemButton key={href} component={Link} href={href} sx={{ minHeight: 60, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}><Icon /></ListItemIcon>
              <ListItemText primary={label} secondary={hint} slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
              <ChevronRightIcon sx={{ color: "text.disabled" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      <SettingsBlock
        title="Copie complète (RGPD)"
        description="Téléchargez l'ensemble de vos informations personnelles et de santé dans un fichier JSON lisible par d'autres services."
      >
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Button variant="outlined" fullWidth startIcon={<DownloadIcon />} onClick={exportJson} disabled={exporting}>
          {exporting ? "Préparation..." : "Exporter mes données (fichier JSON)"}
        </Button>
      </SettingsBlock>
    </Box>
  );
};
