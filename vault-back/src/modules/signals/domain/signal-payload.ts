import type { LinguisticMarkers } from './linguistic-markers.js';

export interface SignalAnswer {
  /** Noul: probability of a yes (0..1). Score: expected level index. */
  value: number;
  /** Score only (0..1). */
  confidence?: number;
}

/** What is stored (encrypted) for one note. */
export interface SignalPayload {
  /** Jev model that produced the answers. */
  model: string;
  answers: Record<string, SignalAnswer>;
  markers: LinguisticMarkers;
}

/** User overrides per question key; for a noul 0..1, for a score a level index. */
export type SignalCorrections = Record<string, number>;
