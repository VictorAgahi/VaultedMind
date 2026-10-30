"use client";

import { useReducer, useEffect } from "react";
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
  Stack,
  TextField
} from "@mui/material";
import {
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Logout as LogoutIcon,
  Download as DownloadIcon,
  DeleteForever as DeleteIcon,
  Shield as ShieldIcon,
  SmartToy as SmartToyIcon,
  Save as SaveIcon,
  AutoAwesome as AutoAwesomeIcon,
  Link as LinkIcon
} from "@mui/icons-material";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "@/components/navbar/navbar";
import { ThemeModeSwitch } from "@/components/theme-mode-switch";
import { CrisisResources } from "@/components/support/crisis-resources";
import { ReminderPreferences } from "@/components/profile/reminder-preferences";
import { PersonalSettings } from "@/components/profile/personal-settings";
import { AppLockSettings } from "@/components/app-lock/app-lock-settings";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { apiService } from "@/services/api.service";

const getExportFilename = () => {
  return `vaultedmind-data-export-${new Date().toISOString().split('T')[0]}.json`;
};

interface ProfileState {
  notificationStatus: NotificationPermission;
  isSubscribing: boolean;
  error: string | null;
  aiContext: string;
  aiContextSaved: boolean;
  isSavingContext: boolean;
  isOptimizingContext: boolean;
  isAiEnabled: boolean;
  loadingStatus: boolean;
}

type ProfileAction =
  | { type: "INIT_SUCCESS"; payload: { isAiEnabled: boolean; aiContext: string } }
  | { type: "INIT_FAILURE" }
  | { type: "SET_NOTIFICATION_STATUS"; payload: NotificationPermission }
  | { type: "SUBSCRIBE_START" }
  | { type: "SUBSCRIBE_SUCCESS"; payload: NotificationPermission }
  | { type: "SUBSCRIBE_FAILURE"; payload: string }
  | { type: "SET_AI_CONTEXT"; payload: string }
  | { type: "SAVE_CONTEXT_START" }
  | { type: "SAVE_CONTEXT_SUCCESS" }
  | { type: "SAVE_CONTEXT_SAVED_CLEARED" }
  | { type: "SAVE_CONTEXT_FAILURE"; payload: string }
  | { type: "OPTIMIZE_CONTEXT_START" }
  | { type: "OPTIMIZE_CONTEXT_SUCCESS"; payload: string }
  | { type: "OPTIMIZE_CONTEXT_FAILURE"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_ERROR"; payload: string };

const initialState: ProfileState = {
  notificationStatus: "default",
  isSubscribing: false,
  error: null,
  aiContext: "",
  aiContextSaved: false,
  isSavingContext: false,
  isOptimizingContext: false,
  isAiEnabled: false,
  loadingStatus: true,
};

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case "INIT_SUCCESS":
      return {
        ...state,
        isAiEnabled: action.payload.isAiEnabled,
        aiContext: action.payload.aiContext,
        loadingStatus: false,
      };
    case "INIT_FAILURE":
      return {
        ...state,
        loadingStatus: false,
      };
    case "SET_NOTIFICATION_STATUS":
      return {
        ...state,
        notificationStatus: action.payload,
      };
    case "SUBSCRIBE_START":
      return {
        ...state,
        isSubscribing: true,
        error: null,
      };
    case "SUBSCRIBE_SUCCESS":
      return {
        ...state,
        isSubscribing: false,
        notificationStatus: action.payload,
      };
    case "SUBSCRIBE_FAILURE":
      return {
        ...state,
        isSubscribing: false,
        error: action.payload,
      };
    case "SET_AI_CONTEXT":
      return {
        ...state,
        aiContext: action.payload,
      };
    case "SAVE_CONTEXT_START":
      return {
        ...state,
        isSavingContext: true,
      };
    case "SAVE_CONTEXT_SUCCESS":
      return {
        ...state,
        isSavingContext: false,
        aiContextSaved: true,
      };
    case "SAVE_CONTEXT_SAVED_CLEARED":
      return {
        ...state,
        aiContextSaved: false,
      };
    case "SAVE_CONTEXT_FAILURE":
      return {
        ...state,
        isSavingContext: false,
        error: action.payload,
      };
    case "OPTIMIZE_CONTEXT_START":
      return {
        ...state,
        isOptimizingContext: true,
        error: null,
      };
    case "OPTIMIZE_CONTEXT_SUCCESS":
      return {
        ...state,
        isOptimizingContext: false,
        aiContext: action.payload,
      };
    case "OPTIMIZE_CONTEXT_FAILURE":
      return {
        ...state,
        isOptimizingContext: false,
        error: action.payload,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [state, dispatch] = useReducer(profileReducer, initialState);

  const {
    notificationStatus,
    isSubscribing,
    error,
    aiContext,
    aiContextSaved,
    isSavingContext,
    isOptimizingContext,
    isAiEnabled,
    loadingStatus,
  } = state;

  useEffect(() => {
    const init = async () => {
      try {
        const [statusRes, contextRes] = await Promise.all([
          apiService.get<{ enabled: boolean }>("/health/ai-insights/status"),
          apiService.get<{ context: string }>("/health/ai-insights/context"),
        ]);
        dispatch({
          type: "INIT_SUCCESS",
          payload: {
            isAiEnabled: statusRes.enabled,
            aiContext: contextRes.context || "",
          },
        });
      } catch (err) {
        console.error("Failed to fetch AI context or status", err);
        dispatch({ type: "INIT_FAILURE" });
      }
    };
    init();
  }, []);

  const handleSaveAiContext = async () => {
    dispatch({ type: "SAVE_CONTEXT_START" });
    try {
      await apiService.post("/health/ai-insights/context", { context: aiContext });
      dispatch({ type: "SAVE_CONTEXT_SUCCESS" });
      setTimeout(() => dispatch({ type: "SAVE_CONTEXT_SAVED_CLEARED" }), 3000);
    } catch (err) {
      console.error("Failed to save AI context", err);
      dispatch({ type: "SAVE_CONTEXT_FAILURE", payload: "Échec de l'enregistrement du contexte." });
    }
  };

  const handleOptimizeAiContext = async () => {
    if (!aiContext || aiContext.trim() === "") {
      dispatch({ type: "SET_ERROR", payload: "Veuillez d'abord saisir un contexte de base à optimiser." });
      return;
    }
    dispatch({ type: "OPTIMIZE_CONTEXT_START" });
    try {
      const res = await apiService.post<{ optimized: string }, { context: string }>(
        "/health/ai-insights/context/optimize",
        { context: aiContext }
      );
      dispatch({ type: "OPTIMIZE_CONTEXT_SUCCESS", payload: res.optimized });
    } catch (err) {
      console.error("Failed to optimize AI context", err);
      dispatch({ type: "OPTIMIZE_CONTEXT_FAILURE", payload: "Échec de l'optimisation par l'IA." });
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (typeof window !== "undefined" && "Notification" in window) {
      timeoutId = setTimeout(() => {
        dispatch({ type: "SET_NOTIFICATION_STATUS", payload: Notification.permission });
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
    dispatch({ type: "SUBSCRIBE_START" });
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
      }

      const permission = await Notification.requestPermission();
      dispatch({ type: "SET_NOTIFICATION_STATUS", payload: permission });

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
        dispatch({ type: "SUBSCRIBE_SUCCESS", payload: permission });
      } else if (permission === "denied") {
        throw new Error("Vous avez bloqué les notifications. Changez les paramètres de votre navigateur pour les activer.");
      }
    } catch (err: unknown) {
      console.error("Notification error:", err);
      dispatch({ type: "SUBSCRIBE_FAILURE", payload: (err as Error).message });
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, mb: 2 }}>
          Mon profil
        </Typography>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.light", color: "primary.main", mr: 2 }}>
              <PersonIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">
                {user.firstName || "Utilisateur VaultedMind"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
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
                      dispatch({ type: "SET_ERROR", payload: (err as Error).message });
                    }
                  }}
                  startIcon={<NotificationsIcon />}
                 
                >
                  Tester la notification (30s)
                </Button>
                <Box sx={{ mt: 2 }}>
                  <ReminderPreferences onUnsubscribed={() => dispatch({ type: "SET_NOTIFICATION_STATUS", payload: "default" })} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Recevez un rappel le soir si vous n&apos;avez pas encore noté votre journée.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleEnableNotifications}
                  disabled={isSubscribing}
                  startIcon={isSubscribing ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
                 
                >
                  {isSubscribing ? "Activation..." : "Activer les notifications"}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Mes informations</Typography>
          <PersonalSettings />
        </Paper>

        <Paper sx={{ borderRadius: 4, mb: 1.5, overflow: "hidden" }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block", px: { xs: 2, sm: 3 }, pt: 2 }}>
            Mon espace
          </Typography>
          <List disablePadding>
            {[
              { href: "/fields", label: "Mes champs", hint: "Ce que vous suivez chaque jour", icon: TuneIcon },
              { href: "/import", label: "Importer des données", hint: "Fichier CSV", icon: CloudUploadIcon },
              { href: "/integrations", label: "Intégrations", hint: "Apple Santé, clés d'API", icon: LinkIcon },
              { href: "/export", label: "Exporter pour mon thérapeute", hint: "Document à imprimer ou en PDF", icon: DescriptionOutlinedIcon },
            ].map(({ href, label, hint, icon: Icon }) => (
              <ListItemButton key={href} component={Link} href={href} sx={{ minHeight: 60, px: { xs: 2, sm: 3 } }}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}><Icon /></ListItemIcon>
                <ListItemText primary={label} secondary={hint} slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
                <ChevronRightIcon sx={{ color: "text.disabled" }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Verrouillage par code</Typography>
          <AppLockSettings />
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Apparence</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Le mode sombre est plus doux pour écrire le soir.
          </Typography>
          <ThemeModeSwitch />
        </Paper>

        <Box sx={{ mb: 1.5 }}>
          <CrisisResources />
        </Box>

        {!loadingStatus && isAiEnabled && (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
              <SmartToyIcon sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
              Personnaliser l&apos;IA
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Donnez un contexte par défaut à votre assistant IA. Ces informations (ex: &quot;Je suis étudiant&quot;, &quot;Je suis très stressé en ce moment&quot;) seront utilisées pour personnaliser ses réponses et vos bilans.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Ex. : J'aimerais que tu sois direct et que tu te concentres sur la productivité..."
              value={aiContext}
              onChange={(e) => dispatch({ type: "SET_AI_CONTEXT", payload: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleOptimizeAiContext}
                disabled={isOptimizingContext || !aiContext || aiContext.trim() === ""}
                startIcon={isOptimizingContext ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
               
              >
                {isOptimizingContext ? "Optimisation..." : "Optimiser via l'IA"}
              </Button>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSaveAiContext}
                disabled={isSavingContext}
                startIcon={isSavingContext ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
               
              >
                {aiContextSaved ? "Contexte sauvegardé !" : "Enregistrer le contexte"}
              </Button>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
            <LinkIcon sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
            Intégrations (Apple Santé)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connectez vos appareils et applications externes (comme Apple Watch et Apple Santé) pour synchroniser automatiquement vos données de santé avec VaultedMind.
          </Typography>
          <Button
            component={Link}
            href="/integrations"
            variant="outlined"
            fullWidth
            startIcon={<LinkIcon />}
           
          >
            Gérer mes intégrations
          </Button>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mb: 1.5 }}>
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
                  dispatch({ type: "SET_ERROR", payload: "Échec de l'exportation des données." });
                }
              }}
             
            >
              Exporter mes données (fichier JSON)
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
                    dispatch({ type: "SET_ERROR", payload: (err as Error).message });
                  }
                }
              }}
             
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
         
        >
          Se déconnecter
        </Button>
      </Container>
    </Box>
  );
}
