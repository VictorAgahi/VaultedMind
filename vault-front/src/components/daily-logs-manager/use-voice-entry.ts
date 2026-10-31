"use client";

import React from "react";
import { apiService } from "@/services/api.service";
import type { ApiError } from "@/types";

export interface AutofillProposal {
  fieldId: string;
  value: string;
  quote: string;
}

interface AutofillDraftResponse {
  proposals: AutofillProposal[];
  skippedFieldIds: string[];
}

export type VoiceStatus = "idle" | "recording" | "transcribing" | "drafting";

export type VoiceErrorKind =
  | "unsupported"
  | "mic-denied"
  | "consent"
  | "rate-limit"
  | "transcription"
  | "draft"
  | "too-long";

export interface VoiceError {
  kind: VoiceErrorKind;
  message: string;
}

export const MAX_RECORDING_SECONDS = 10 * 60;
export const NOTES_MAX_LENGTH = 10000;

// Safari enregistre en audio/mp4, Chrome et Firefox en audio/webm.
const MIME_CANDIDATES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionOf(mimeType: string): string {
  return mimeType.startsWith("audio/mp4") ? "m4a" : "webm";
}

export function describeApiError(err: unknown, fallbackKind: "transcription" | "draft"): VoiceError {
  const error = err as Partial<ApiError> | null;
  if (error?.statusCode === 403 || error?.code === "AI_CONSENT_REQUIRED") {
    return {
      kind: "consent",
      message: "L'assistant IA doit être activé, avec l'envoi des notes, pour utiliser cette fonction.",
    };
  }
  if (error?.statusCode === 429) {
    return { kind: "rate-limit", message: error.message || "Limite quotidienne atteinte. Réessayez plus tard." };
  }
  if (error?.statusCode === 413) {
    return { kind: "too-long", message: "L'enregistrement est trop long. Racontez votre journée en plusieurs fois." };
  }
  if (fallbackKind === "transcription") {
    return {
      kind: "transcription",
      message: "La transcription a échoué et l'enregistrement est perdu : il n'est pas conservé. Recommencez, ou écrivez votre note.",
    };
  }
  return {
    kind: "draft",
    message: "Le pré-remplissage a échoué. Votre note est conservée : réessayez avec « Remplir depuis ma note ».",
  };
}

interface UseVoiceEntryOptions {
  logDate: string;
  notes: string;
  setNotes: (notes: string) => void;
  /** Reçoit les propositions du serveur et renvoie combien de champs ont été pré-remplis. */
  onProposals: (proposals: AutofillProposal[]) => number;
}

export function useVoiceEntry({ logDate, notes, setNotes, onProposals }: UseVoiceEntryOptions) {
  const [status, setStatus] = React.useState<VoiceStatus>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState<VoiceError | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const discardRef = React.useRef(false);
  // Dernière version des props, lue par les rappels asynchrones (fin d'enregistrement, réponses réseau).
  const latest = React.useRef({ logDate, notes, setNotes, onProposals });
  React.useEffect(() => {
    latest.current = { logDate, notes, setNotes, onProposals };
  });

  const releaseStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    if (status !== "recording") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [status]);

  // Fermer la saisie en pleine prise coupe le micro et jette l'enregistrement.
  React.useEffect(() => {
    return () => {
      discardRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
    };
  }, [releaseStream]);

  const requestDraft = React.useCallback(async (text: string) => {
    setStatus("drafting");
    try {
      const draft = await apiService.post<AutofillDraftResponse, { text: string; logDate: string }>(
        "/health/daily-logs/autofill-draft",
        { text, logDate: latest.current.logDate },
      );
      const applied = latest.current.onProposals(draft.proposals);
      setInfo(
        applied > 0
          ? `${applied} ${applied > 1 ? "champs sont proposés" : "champ est proposé"}, à vérifier dans les étapes.`
          : "Rien de précis à pré-remplir : seuls les faits que vous énoncez sont repris.",
      );
    } catch (err) {
      setError(describeApiError(err, "draft"));
    } finally {
      setStatus("idle");
    }
  }, []);

  const fillFromNote = React.useCallback(() => {
    const text = latest.current.notes.trim();
    if (!text || status !== "idle") return;
    setError(null);
    setInfo(null);
    void requestDraft(text);
  }, [requestDraft, status]);

  const transcribeAndDraft = React.useCallback(
    async (blob: Blob, mimeType: string) => {
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, `recording.${extensionOf(mimeType)}`);
        const { text } = await apiService.postForm<{ text: string }>("/health/daily-logs/voice-transcription", form);
        const transcript = text.trim();
        if (!transcript) {
          setError({ kind: "transcription", message: "Aucune parole n'a été détectée. Réessayez en vous rapprochant du micro." });
          setStatus("idle");
          return;
        }
        const existing = latest.current.notes.trim();
        const combined = existing ? `${existing}\n\n${transcript}` : transcript;
        const fullNotes = combined.slice(0, NOTES_MAX_LENGTH);
        latest.current.setNotes(fullNotes);
        if (combined.length > NOTES_MAX_LENGTH) {
          setError({ kind: "too-long", message: "La note a atteint 10 000 caractères : la fin du récit a été coupée." });
        }
        await requestDraft(fullNotes);
      } catch (err) {
        setError(describeApiError(err, "transcription"));
        setStatus("idle");
      }
    },
    [requestDraft],
  );

  const start = React.useCallback(async () => {
    if (status !== "idle") return;
    setError(null);
    setInfo(null);
    const mimeType = pickMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "unsupported",
        message: "L'enregistrement n'est pas disponible sur cet appareil. Utilisez la dictée du clavier dans la note, puis « Remplir depuis ma note ».",
      });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError({
        kind: "mic-denied",
        message: "L'accès au micro est refusé. Autorisez-le dans les réglages du navigateur, ou utilisez la dictée du clavier dans la note.",
      });
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    discardRef.current = false;
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      releaseStream();
      if (discardRef.current) return;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setStatus("idle");
        return;
      }
      void transcribeAndDraft(blob, mimeType);
    };
    recorderRef.current = recorder;
    setElapsed(0);
    recorder.start();
    setStatus("recording");
  }, [releaseStream, status, transcribeAndDraft]);

  const stop = React.useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const dismissError = React.useCallback(() => setError(null), []);

  return { status, elapsed, error, info, start, stop, fillFromNote, dismissError };
}
