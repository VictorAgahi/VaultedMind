// Verrouillage local de l'application par code. Le code n'est jamais stocké : seulement une empreinte salée.
const STORAGE_KEY = "vaultedmind:app-lock";
export const APP_LOCK_CHANGED_EVENT = "vaultedmind:app-lock-changed";

export interface AppLockConfig {
  salt: string;
  hash: string;
  /** Délai d'inactivité (en minutes) avant de redemander le code. */
  timeoutMinutes: number;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function digest(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export function readAppLock(): AppLockConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppLockConfig) : null;
  } catch {
    return null;
  }
}

export async function enableAppLock(pin: string, timeoutMinutes: number): Promise<void> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const config: AppLockConfig = { salt, hash: await digest(pin, salt), timeoutMinutes };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
}

export function updateLockTimeout(timeoutMinutes: number): void {
  const config = readAppLock();
  if (!config) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, timeoutMinutes }));
  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
}

export function disableAppLock(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } finally {
    window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = readAppLock();
  if (!config) return true;
  return (await digest(pin, config.salt)) === config.hash;
}

export const isValidPin = (pin: string): boolean => /^\d{4,6}$/.test(pin);
