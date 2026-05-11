"use client";

import React, { useState, useEffect } from "react";
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Avatar, 
  Button, 
  Divider, 
  Alert,
  CircularProgress
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import { useAuth } from "@/context/auth-context";
import { apiService } from "@/services/api.service";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setTimeout(() => {
        setNotificationStatus(Notification.permission);
      }, 0);
    }
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
    } catch (err) {
      console.error("Notification error:", err);
      setError((err as Error).message);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!user) return null;

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: "primary.main" }}>
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
                    setError("Erreur lors de l'envoi du test.");
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
                Recevez des rappels quotidiens à 18h30 pour ne jamais oublier de remplir votre journal.
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
  );
}
