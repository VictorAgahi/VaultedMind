"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Box, Button, Typography } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import { useAuth } from "@/context/auth-context";
import { BrandSeal } from "@/components/brand/brand-mark";
import { APP_LOCK_CHANGED_EVENT, disableAppLock, readAppLock, verifyPin } from "./app-lock-store";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/about", "/contact", "/privacy", "/terms", "/security-policy", "/offline"];
const LAST_ACTIVE_KEY = "vaultedmind:last-active";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

const now = (): number => Date.now();

function readLastActive(): number {
  try {
    return Number(sessionStorage.getItem(LAST_ACTIVE_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function writeLastActive(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVE_KEY, String(now()));
  } catch {
    // Stockage indisponible : le code sera redemandé à chaque ouverture.
  }
}

// Écran de code qui recouvre l'application à l'ouverture, puis après le délai d'inactivité choisi.
export const AppLockGate: React.FC = () => {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const [locked, setLocked] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const evaluate = React.useCallback(() => {
    const config = readAppLock();
    if (!config) {
      setLocked(false);
      return;
    }
    const lastActive = readLastActive();
    setLocked(lastActive === 0 || now() - lastActive > config.timeoutMinutes * 60_000);
  }, []);

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") writeLastActive();
      else evaluate();
    };
    const onActivity = () => {
      if (!document.hidden) writeLastActive();
    };
    const timer = setTimeout(evaluate, 0);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(APP_LOCK_CHANGED_EVENT, writeLastActive);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, writeLastActive);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [evaluate]);

  const unlock = () => {
    writeLastActive();
    setLocked(false);
    setPin("");
    setError(null);
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (key === "") return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, 6);
    setPin(next);
    setError(null);
    // Le code fait 4 à 6 chiffres : on vérifie dès 4, et on signale l'erreur une fois les 6 saisis.
    if (next.length >= 4) {
      verifyPin(next).then((ok) => {
        if (ok) unlock();
        else if (next.length === 6) {
          setPin("");
          setError("Code incorrect. Réessayez.");
        }
      });
    }
  };

  // Récupération : se reconnecter avec son mot de passe retire le verrouillage de cet appareil.
  const forgotPin = () => {
    disableAppLock();
    setLocked(false);
    logout();
  };

  if (!locked || !isAuthenticated || PUBLIC_ROUTES.includes(pathname)) return null;

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Application verrouillée"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        px: 3,
        pt: "env(safe-area-inset-top, 0px)",
        pb: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <BrandSeal size={48} />
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h3" component="h1">Carnet verrouillé</Typography>
        <Typography color="text.secondary">Saisissez votre code</Typography>
      </Box>
      <Box aria-hidden sx={{ display: "flex", gap: 1.5, height: 16 }}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <Box key={i} sx={{ width: 14, height: 14, borderRadius: "50%", border: 2, borderColor: "primary.main", bgcolor: i < pin.length ? "primary.main" : "transparent" }} />
        ))}
      </Box>
      <Typography role="alert" variant="body2" color="error.main" sx={{ minHeight: 20 }}>{error}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 1.5 }}>
        {KEYS.map((key, i) =>
          key === "" ? (
            <Box key={i} />
          ) : (
            <Button
              key={i}
              onClick={() => press(key)}
              aria-label={key === "del" ? "Effacer" : key}
              sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "background.paper", color: "text.primary", fontSize: "1.5rem", fontWeight: 600 }}
            >
              {key === "del" ? <BackspaceOutlinedIcon /> : key}
            </Button>
          )
        )}
      </Box>
      <Button color="inherit" onClick={forgotPin} sx={{ mt: 1 }}>
        Code oublié ? Se reconnecter
      </Button>
    </Box>
  );
};
