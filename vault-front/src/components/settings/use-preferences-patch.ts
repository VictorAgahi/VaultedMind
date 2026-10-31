"use client";

import React from "react";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import type { CustomSignal, InsightTarget, Person, TrackedSubject } from "@/types";

export type PreferencesUpdate = Record<string, string | boolean | null | Person[] | InsightTarget[] | TrackedSubject | CustomSignal[]>;

// Enregistre un réglage de /users/me/preferences puis recharge l'utilisateur.
export const usePreferencesPatch = () => {
  const { refreshUser } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  const patch = async (update: PreferencesUpdate, done: string) => {
    setSaving(true);
    setStatus(null);
    try {
      await apiService.patch("/users/me/preferences", update);
      await refreshUser();
      setStatus(done);
    } catch (err) {
      setStatus((err as Error).message || "Le réglage n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const clearStatus = () => setStatus(null);

  return { saving, status, patch, clearStatus };
};
