// File d'attente locale des saisies faites hors ligne, envoyée dès le retour du réseau.
import { apiService } from "@/services/api.service";
import type { CustomField, DailyLog } from "@/types";

export interface DailyEntryPayload {
  logId?: string;
  logDate: string;
  notes?: string;
  values: { customFieldId: string; value: string; subValues?: Record<string, string>; source?: "agent" }[];
  clearedFieldIds: string[];
}

const STORAGE_KEY = "vaultedmind:entry-outbox";
export const OUTBOX_FLUSHED_EVENT = "vaultedmind:outbox-flushed";

function read(): DailyEntryPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DailyEntryPayload[]) : [];
  } catch {
    return [];
  }
}

function write(entries: DailyEntryPayload[]): void {
  try {
    if (entries.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Stockage indisponible (navigation privée) : rien à faire de plus.
  }
}

/** Une seule saisie en attente par jour : la plus récente remplace la précédente. */
export function queueEntry(entry: DailyEntryPayload): void {
  write([...read().filter((e) => e.logDate !== entry.logDate), entry]);
}

export function pendingEntriesCount(): number {
  return read().length;
}

export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  return statusCode === 0 || error instanceof TypeError;
}

let flushing = false;

/** Renvoie le nombre de saisies envoyées. */
export async function flushOutbox(): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const entry of read()) {
      try {
        await apiService.post("/health/daily-logs/entry", entry);
        write(read().filter((e) => e.logDate !== entry.logDate));
        sent++;
      } catch (error) {
        if (isNetworkFailure(error)) break;
        // Refus du serveur (champ supprimé…) : on abandonne cette saisie plutôt que de bloquer la file.
        write(read().filter((e) => e.logDate !== entry.logDate));
      }
    }
  } finally {
    flushing = false;
  }
  if (sent > 0) window.dispatchEvent(new CustomEvent(OUTBOX_FLUSHED_EVENT, { detail: { sent } }));
  return sent;
}

const SNAPSHOT_KEY = "vaultedmind:offline-snapshot";

interface OfflineSnapshot {
  fields: CustomField[];
  logs: DailyLog[];
}

/**
 * Copie locale minimale pour l'usage hors ligne : champs et valeurs des 60 derniers jours,
 * sans les notes libres (elles ne quittent pas le serveur pour être stockées en clair sur l'appareil).
 */
export function saveOfflineSnapshot(fields: CustomField[], logs: DailyLog[]): void {
  const cutoff = Date.now() - 60 * 86_400_000;
  const snapshot: OfflineSnapshot = {
    fields,
    logs: logs
      .filter((log) => new Date(log.logDate).getTime() >= cutoff)
      .map((log) => ({ ...log, notes: undefined })),
  };
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota dépassé ou stockage indisponible : l'usage hors ligne sera simplement indisponible.
  }
}

export function readOfflineSnapshot(): OfflineSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as OfflineSnapshot) : null;
  } catch {
    return null;
  }
}

export function clearOfflineData(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à nettoyer.
  }
}
