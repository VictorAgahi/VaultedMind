"use client";

import React from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { apiService } from "@/services/api.service";
import { ReminderPreferences } from "@/components/profile/reminder-preferences";
import { SettingsBlock } from "./settings-block";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Notifications push de cet appareil et rappel du soir.
export const NotificationSettings: React.FC = () => {
  const [permission, setPermission] = React.useState<NotificationPermission>("default");
  const [subscribing, setSubscribing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // Lecture de la permission du navigateur (pas un appel réseau), seulement côté client.
  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const timeoutId = setTimeout(() => setPermission(Notification.permission), 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const enable = async () => {
    setSubscribing(true);
    setError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
      }
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) throw new Error("Clé VAPID manquante.");
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          });
        }
        await apiService.post("/notifications/subscribe", subscription);
      } else if (result === "denied") {
        throw new Error("Vous avez bloqué les notifications. Changez les paramètres de votre navigateur pour les activer.");
      }
    } catch (err: unknown) {
      console.error("Notification error:", err);
      setError((err as Error).message);
    } finally {
      setSubscribing(false);
    }
  };

  const sendTest = async () => {
    setError(null);
    try {
      await apiService.post("/notifications/test");
      setInfo("Notification de test programmée dans 30 secondes. Vous pouvez fermer l'application pour la recevoir.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <SettingsBlock
        title="Notifications sur cet appareil"
        description={permission === "granted" ? undefined : "Recevez un rappel le soir si vous n'avez pas encore noté votre journée."}
      >
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {info && <Alert severity="info" sx={{ mb: 1.5 }} onClose={() => setInfo(null)}>{info}</Alert>}
        {permission === "granted" ? (
          <>
            <Alert severity="success" icon={<NotificationsActiveIcon />} sx={{ borderRadius: 3, mb: 1.5 }}>
              Notifications activées pour cet appareil.
            </Alert>
            <Button variant="outlined" fullWidth onClick={sendTest} startIcon={<NotificationsIcon />}>
              Tester la notification (30 s)
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={enable}
            disabled={subscribing}
            startIcon={subscribing ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
          >
            {subscribing ? "Activation..." : "Activer les notifications"}
          </Button>
        )}
      </SettingsBlock>
      {permission === "granted" && (
        <SettingsBlock title="Rappel du soir">
          <ReminderPreferences onUnsubscribed={() => setPermission("default")} />
        </SettingsBlock>
      )}
      {permission !== "granted" && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
          L&apos;heure du rappel se règle une fois les notifications activées.
        </Typography>
      )}
    </Box>
  );
};
