"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Stack
} from "@mui/material";
import {
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Logout as LogoutIcon,
  Download as DownloadIcon,
  DeleteForever as DeleteIcon,
  Shield as ShieldIcon
} from "@mui/icons-material";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar/navbar";
import { apiService } from "@/services/api.service";

const getExportFilename = () => {
  return `vaultedmind-data-export-${new Date().toISOString().split('T')[0]}.json`;
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (typeof window !== "undefined" && "Notification" in window) {
      timeoutId = setTimeout(() => {
        setNotificationStatus(Notification.permission);
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    setError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
      }

      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicVapidKey) {
          throw new Error("Clé VAPID manquante.");
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });
        }

        await apiService.post("/notifications/subscribe", subscription);
      } else if (permission === "denied") {
        throw new Error("Vous avez bloqué les notifications. Changez les paramètres de votre navigateur pour les activer.");
      }
    } catch (err: unknown) {
      console.error("Notification error:", err);
      setError((err as Error).message);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 6, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, color: "#142949", mb: 4 }}>
          Mon Profil
        </Typography>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", mr: 2 }}>
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Utilisateur VaultedMind
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
              <NotificationsIcon sx={{ mr: 1, fontSize: 20 }} />
              Notifications
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {notificationStatus === "granted" ? (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" icon={<NotificationsActiveIcon />} sx={{ borderRadius: 3, mb: 2 }}>
                  Notifications activées pour cet appareil.
                </Alert>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={async () => {
                    try {
                      await apiService.post("/notifications/test");
                      alert("Notification de test programmée dans 30 secondes ! Reste sur la page ou ferme l'onglet pour tester.");
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                  startIcon={<NotificationsIcon />}
                  sx={{ borderRadius: 3, py: 1.2, textTransform: "none", fontWeight: 600 }}
                >
                  Tester la notification (30s)
                </Button>
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Recevez des rappels quotidiens à 22h30 pour ne jamais oublier de remplir votre journal.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleEnableNotifications}
                  disabled={isSubscribing}
                  startIcon={isSubscribing ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
                  sx={{ borderRadius: 3, py: 1.2, textTransform: "none", fontWeight: 600 }}
                >
                  {isSubscribing ? "Activation..." : "Activer les notifications"}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
            <ShieldIcon sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
            Sécurité et Données (RGPD)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Conformément au <strong>Règlement Général sur la Protection des Données (RGPD)</strong>, vous disposez d&apos;un contrôle total sur vos informations personnelles et de santé.
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={async () => {
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
                }
              }}
              sx={{ borderRadius: 3, py: 1.2, textTransform: "none", fontWeight: 600 }}
            >
              Exporter mes données (JSON AES-256)
            </Button>

            <Button
              variant="outlined"
              color="error"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={async () => {
                if (window.confirm("ÊTES-VOUS ABSOLUMENT SÛR ? Cette action est irréversible et supprimera définitivement votre coffre-fort mental, vos clés de chiffrement et toutes vos données de santé.")) {
                  try {
                    await apiService.delete("/auth/account");
                    logout();
                  } catch (err: unknown) {
                    setError((err as Error).message);
                  }
                }
              }}
              sx={{ borderRadius: 3, py: 1.2, textTransform: "none", fontWeight: 600 }}
            >
              Supprimer définitivement mon compte
            </Button>
          </Stack>
        </Paper>

        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={logout}
          startIcon={<LogoutIcon />}
          sx={{ borderRadius: 3, py: 1.2, textTransform: "none", fontWeight: 600 }}
        >
          Se déconnecter
        </Button>
      </Container>
    </Box>
  );
}
