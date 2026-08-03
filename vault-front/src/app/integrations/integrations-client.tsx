"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { apiService } from "@/services/api.service";
import { ApiKey, CreateApiKeyDto } from "@/types";

export const IntegrationsClient = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<ApiKey[]>("/api-keys");
      setApiKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les clés d'API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApiKeys();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      setError(null);
      const data = await apiService.post<{ apiKey: ApiKey; secretKey: string }, CreateApiKeyDto>("/api-keys", {
        name: newKeyName.trim(),
      });
      setNewSecretKey(data.secretKey);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la clé.");
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette clé ? L'intégration cessera de fonctionner.")) return;
    try {
      await apiService.delete(`/api-keys/${id}`);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer la clé.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Clé copiée !");
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewKeyName("");
    setNewSecretKey(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "#142949" }}>
        Intégrations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connectez vos applications tierces (comme Apple Santé) à Vaulted Mind.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Clés d&apos;API
          </Typography>
          <Button variant="contained" onClick={() => setIsDialogOpen(true)}>
            Générer une clé
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Utilisez ces clés pour configurer le raccourci Apple Santé (Apple Shortcuts) afin de synchroniser vos données automatiquement.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : apiKeys.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune clé d&apos;API générée.
          </Typography>
        ) : (
          <List>
            {apiKeys.map((key) => (
              <ListItem
                key={key.id}
                sx={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 2, mb: 1 }}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleDeleteKey(key.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600 }}>{key.name}</Typography>}
                  secondary={`Créée le ${new Date(key.createdAt).toLocaleDateString()} - Dernière utilisation : ${key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Jamais'}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Instructions Apple Health */}
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Comment configurer Apple Santé
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          1. Générez une clé d&apos;API ci-dessus.
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          2. Assurez-vous d&apos;avoir associé vos champs personnalisés aux métriques Apple Watch (dans &quot;Champs&quot;).
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          3. Créez un Raccourci (Shortcuts) sur votre iPhone qui récupère les données de Santé.
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          4. Dans le raccourci, ajoutez une action &quot;Obtenir le contenu de l&apos;URL&quot; pour faire un POST vers 
          <code>{` https://api.vaultedmind.com/api/integrations/health/sync `}</code> avec l&apos;en-tête <code>Authorization: Bearer VOTRE_CLE_API</code> et le JSON :
        </Typography>
        <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 2, mb: 2, overflowX: "auto" }}>
          <pre>
{`{
  "metric": "SLEEP",
  "value": 7.5,
  "date": "2026-08-03"
}`}
          </pre>
        </Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          5. Collez cette clé dans le raccourci lorsque l&apos;application vous le demande.
        </Typography>
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<FileDownloadIcon />}
            href="https://www.icloud.com/shortcuts/b527d98258c74c0483c85ce954a5d5a0"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 700 }}
          >
            Télécharger le raccourci Apple Santé
          </Button>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
            Nécessite l&apos;application Raccourcis (Shortcuts) sur iPhone.
          </Typography>
        </Box>
      </Paper>

      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Générer une clé d&apos;API</DialogTitle>
        <DialogContent dividers>
          {newSecretKey ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Clé générée avec succès ! Copiez-la maintenant car elle ne sera plus affichée.
              </Alert>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField fullWidth value={newSecretKey} slotProps={{ htmlInput: { readOnly: true } }} />
                <IconButton onClick={() => handleCopy(newSecretKey)} color="primary">
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <TextField
              fullWidth
              label="Nom de la clé (ex: iPhone Raccourcis)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog}>Fermer</Button>
          {!newSecretKey && (
            <Button variant="contained" onClick={handleCreateKey} disabled={!newKeyName.trim()}>
              Créer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
