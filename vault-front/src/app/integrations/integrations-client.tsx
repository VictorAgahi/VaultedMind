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
import { HEALTH_SHORTCUT_NAME } from "@/components/daily-logs-manager/health-sync-button";
import { apiService } from "@/services/api.service";
import { ApiKey, CreateApiKeyDto } from "@/types";

const API_BASE_URL = "https://api-vault-mind.cyrus-ag.com";
const BATCH_URL = `${API_BASE_URL}/integrations/health/batch`;

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
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "var(--mui-palette-text-primary)" }}>
        Intégrations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connectez vos applications tierces (comme Apple Santé) à VaultedMind.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Synchronisation Apple Santé en un geste */}
      <Paper sx={{ p: 4, borderRadius: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Apple Santé : synchronisation en un geste
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sommeil, pas, calories actives, fréquence cardiaque au repos, variabilité cardiaque, minutes d&apos;exercice, fréquence respiratoire et eau arrivent dans votre journée, chiffrés, depuis votre iPhone (et votre Apple Watch si vous en avez une). Aucune clé à copier.
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          1. Installer le raccourci
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Sur votre iPhone, ouvrez cette page dans Safari et touchez le bouton ci-dessous. Ouvrez le fichier téléchargé, puis touchez « Ajouter le raccourci ». Gardez le nom « {HEALTH_SHORTCUT_NAME} » : l&apos;application s&apos;en sert pour le lancer.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Au premier lancement, Santé demande les autorisations : touchez « Tout autoriser ».
        </Typography>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          href="/shortcuts/vaultedmind-sync.shortcut"
          download={`${HEALTH_SHORTCUT_NAME}.shortcut`}
          sx={{ borderRadius: 3, px: 3, mb: 4 }}
        >
          Installer le raccourci
        </Button>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          2. Chaque soir : Récupérer mes données Santé
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Ouvrez la saisie du jour et touchez « Récupérer mes données Santé ». VaultedMind prépare un lien à usage unique valable 5 minutes, ouvre le raccourci, qui lit les données du jour dans Santé et les envoie, puis vous ramène dans l&apos;application. Les champs manquants (catégorie « Apple Santé ») sont créés automatiquement.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Le sommeil est calculé à partir de la nuit qui se termine aujourd&apos;hui (de 18 h la veille à 18 h), en comptant une seule fois les périodes qui se chevauchent.
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          3. Facultatif : automatisation avec une clé d&apos;API
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Une automatisation du raccourci (par exemple chaque soir à une heure fixe) ne peut pas passer par l&apos;application : elle utilise une clé d&apos;API permanente, générée plus bas. Envoyez un POST vers <code>{BATCH_URL}</code> avec l&apos;en-tête <code>X-API-Key</code> et un corps JSON :
        </Typography>
        <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 2, overflowX: "auto" }}>
          <pre style={{ margin: 0 }}>
{`{
  "date": "2026-10-31",
  "quantities": [
    { "metric": "STEPS", "value": 8042 }
  ],
  "sleepLines": "Core|2026-10-30T23:30:00+01:00|2026-10-31T03:00:00+01:00"
}`}
          </pre>
        </Box>
      </Paper>

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
          Réservées aux automatisations. Le raccourci de l&apos;étape 1 n&apos;en a pas besoin.
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
                sx={{ border: "1px solid var(--mui-palette-divider)", borderRadius: 2, mb: 1 }}
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

      {/* Diagnostic : raccourcis de vérification qui n'envoient rien */}
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Diagnostic
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          À utiliser si la synchronisation ne ramène pas les bonnes valeurs. Aucun de ces raccourcis n&apos;envoie quoi que ce soit à VaultedMind. Même installation que ci-dessus : Safari, ouvrir le fichier, « Ajouter le raccourci ».
        </Typography>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            href="/shortcuts/vaultedmind-sync-debug.shortcut"
            download={`${HEALTH_SHORTCUT_NAME} Debug.shortcut`}
          >
            Raccourci de contrôle (affiche les données à envoyer)
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            href="/shortcuts/vaultedmind-test-sante.shortcut"
            download="VaultedMind Test Sante.shortcut"
          >
            Raccourci de test (pas et sommeil bruts)
          </Button>
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
