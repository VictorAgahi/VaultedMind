"use client";

import { useSyncExternalStore } from "react";

let currentTimestamp = 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  currentTimestamp = Date.now();
  setInterval(() => {
    currentTimestamp = Date.now();
    listeners.forEach((listener) => listener());
  }, 30000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  return currentTimestamp;
}

function getServerSnapshot(): number {
  return 0;
}

export function useCurrentTime(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
