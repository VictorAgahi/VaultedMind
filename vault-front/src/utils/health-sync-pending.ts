// Mémorise, le temps d'un aller-retour vers le raccourci Apple Santé, la saisie en cours et le fait qu'une synchronisation est attendue.
// Tout accès au stockage est protégé : sans stockage, l'application fonctionne, sans reprise automatique.

const MARKER_KEY = "vaultedmind:health-sync-pending";
const DRAFT_KEY = "vaultedmind:health-sync-draft";

/** Au-delà, la synchronisation et le brouillon sont considérés comme périmés. */
export const HEALTH_SYNC_MAX_AGE_MS = 10 * 60 * 1000;

export interface HealthSyncMarker {
  date: string;
  startedAt: number;
  /** Valeurs Santé de la journée avant la synchronisation, pour reconnaître l'arrivée de nouvelles données. */
  baseline: Record<string, string>;
}

export interface HealthSyncDraft {
  date: string;
  notes: string;
  fieldValues: Record<string, string>;
  subFieldValues: Record<string, Record<string, string>>;
  agentSources: Record<string, { value: string; quote?: string }>;
  defaultedFieldIds: string[];
  step: number;
  isEditing: boolean;
  logId: string | null;
  savedAt: number;
}

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : on continue sans reprise automatique.
  }
};

const remove = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Rien à nettoyer.
  }
};

export const saveHealthSyncPending = (marker: HealthSyncMarker, draft: HealthSyncDraft | null): void => {
  writeJson(MARKER_KEY, marker);
  if (draft) writeJson(DRAFT_KEY, draft);
  else remove(DRAFT_KEY);
};

export const readHealthSyncMarker = (): HealthSyncMarker | null => {
  const marker = readJson<HealthSyncMarker>(MARKER_KEY);
  if (!marker || typeof marker.startedAt !== "number" || typeof marker.date !== "string") return null;
  if (Date.now() - marker.startedAt > HEALTH_SYNC_MAX_AGE_MS) return null;
  return marker;
};

export const readHealthSyncDraft = (expectedDate: string): HealthSyncDraft | null => {
  const draft = readJson<HealthSyncDraft>(DRAFT_KEY);
  if (!draft || typeof draft.savedAt !== "number") return null;
  if (draft.date !== expectedDate || Date.now() - draft.savedAt > HEALTH_SYNC_MAX_AGE_MS) return null;
  return draft;
};

export const clearHealthSyncPending = (): void => {
  remove(MARKER_KEY);
  remove(DRAFT_KEY);
};
