"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, ButtonBase, CircularProgress, IconButton, InputBase, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { AIChatStatusResponseDto } from "@/types";
import { MarkdownRenderer } from "./insights-panel";
import { ChatSuggestedAction, ChatSuggestedActionsList } from "./chat-suggested-actions";
import { AiConsentDialog } from "./ai-consent-dialog";
import { CrisisResources } from "@/components/support/crisis-resources";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedActions?: ChatSuggestedAction[];
  safety?: boolean;
  error?: boolean;
}

interface ChatReply {
  response: string;
  suggestedActions?: ChatSuggestedAction[];
  remainingPrompts?: number;
  nextAvailableAt?: string | null;
  safety?: boolean;
}

const HISTORY_TURNS = 6;

const STARTERS = [
  "Qu'est-ce qui a le plus influencé mon humeur ce mois-ci ?",
  "Est-ce que je dors mieux les jours où je fais du sport ?",
  "Résume ma semaine en trois points.",
  "Quels champs pourrais-je ajouter pour mieux me comprendre ?",
];

/**
 * Suit la zone réellement visible (visualViewport) : quand le clavier s'ouvre, l'écran rétrécit
 * à la hauteur visible et la barre de saisie reste collée juste au-dessus du clavier, sans saut.
 */
function useVisibleViewport() {
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number; keyboardOpen: boolean } | null>(null);

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      const height = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      setViewport({ height, offsetTop, keyboardOpen: window.innerHeight - height > 120 });
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return viewport;
}

// Bloque le défilement de la page derrière l'écran de chat (sinon iOS fait glisser tout le document).
function useLockedPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const previous = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous.overflow;
      html.style.overscrollBehavior = previous.overscroll;
      document.body.style.overflow = "";
    };
  }, []);
}

const TypingDots: React.FC = () => (
  <Box role="status" aria-label="L'assistant écrit" sx={{ display: "flex", gap: 0.75, py: 1.5 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "text.disabled",
          "@keyframes vmDot": { "0%, 80%, 100%": { opacity: 0.25 }, "40%": { opacity: 1 } },
          animation: "vmDot 1.2s infinite ease-in-out",
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
  </Box>
);

export function ChatScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const viewport = useVisibleViewport();
  useLockedPageScroll();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [quota, setQuota] = useState<AIChatStatusResponseDto | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoPrompted = useRef(false);

  const refreshStatus = React.useCallback(async () => {
    try {
      const { enabled } = await apiService.get<{ enabled: boolean }>("/health/ai-insights/status");
      setAiReady(enabled);
      if (enabled) setQuota(await apiService.get<AIChatStatusResponseDto>("/health/ai-chat/status"));
    } catch {
      setAiReady(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      try {
        const { enabled } = await apiService.get<{ enabled: boolean }>("/health/ai-insights/status");
        const status = enabled ? await apiService.get<AIChatStatusResponseDto>("/health/ai-chat/status") : null;
        if (!active) return;
        setAiReady(enabled);
        setQuota(status);
      } catch {
        if (active) setAiReady(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Le dernier message reste visible, y compris quand le clavier s'ouvre et réduit la zone.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isPending, viewport?.height]);

  const outOfQuota = quota !== null && quota.remaining === 0;

  const send = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isPending || outOfQuota) return;
    if (!aiReady) {
      setConsentOpen(true);
      return;
    }

    const history = messages
      .filter((m) => !m.error)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    startTransition(async () => {
      try {
        const reply = await apiService.post<ChatReply>("/health/ai-chat", { message: text, history });
        if (typeof reply.remainingPrompts === "number") {
          setQuota((prev) => ({
            count: (prev?.maxAllowed ?? 5) - (reply.remainingPrompts ?? 0),
            maxAllowed: prev?.maxAllowed ?? 5,
            remaining: reply.remainingPrompts ?? 0,
            nextAvailableAt: reply.nextAvailableAt ?? null,
            cooldownRemainingMs: 0,
          }));
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: reply.response,
            suggestedActions: reply.suggestedActions,
            safety: reply.safety,
          },
        ]);
      } catch (err) {
        const message = (err as Error).message || "La réponse n'a pas pu être générée. Réessayez dans un instant.";
        if (/consent|IA, acceptez/i.test(message)) {
          setAiReady(false);
          setConsentOpen(true);
        }
        if (/Limite de messages/i.test(message)) {
          setQuota((prev) => (prev ? { ...prev, remaining: 0 } : prev));
        }
        setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: message, error: true }]);
      }
    });
  };

  // Lien "En discuter avec l'assistant" : la question arrive pré-remplie et part automatiquement.
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && aiReady && !autoPrompted.current) {
      autoPrompted.current = true;
      router.replace("/ai/chat", { scroll: false });
      send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiReady, searchParams]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Entrée envoie sur ordinateur ; sur mobile, Entrée insère une ligne (le bouton envoie).
    if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault();
      send();
    }
  };

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/ai");
  };

  const firstName = user?.firstName;
  const height = viewport ? `${viewport.height}px` : "100dvh";

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        height,
        transform: viewport ? `translateY(${viewport.offsetTop}px)` : "none",
        zIndex: 1250,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* En-tête */}
      <Box
        component="header"
        sx={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1,
          pt: "calc(env(safe-area-inset-top, 0px) + 4px)",
          pb: 0.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <IconButton onClick={goBack} aria-label="Retour">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" noWrap>Assistant</Typography>
          {quota && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
              {outOfQuota ? "Plus de question disponible pour l'instant" : `${quota.remaining} question${quota.remaining > 1 ? "s" : ""} restante${quota.remaining > 1 ? "s" : ""}`}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Fil de messages : seul élément qui défile */}
      <Box
        ref={scrollRef}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >
        <Box sx={{ maxWidth: 760, mx: "auto", px: 2, py: 2, display: "grid", gap: 2 }}>
          {aiReady === null ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>
          ) : messages.length === 0 ? (
            <Box sx={{ display: "grid", gap: 2, pt: { xs: 4, md: 8 } }}>
              <Typography variant="h2" component="p">
                {firstName ? `Bonjour ${firstName}, ` : "Bonjour, "}de quoi voulez-vous parler ?
              </Typography>
              <Typography color="text.secondary">
                Je m&apos;appuie sur vos journaux pour vous répondre. Je ne remplace pas un professionnel de santé.
              </Typography>
              {!aiReady && (
                <ButtonBase
                  onClick={() => setConsentOpen(true)}
                  sx={{ justifyContent: "flex-start", p: 2, borderRadius: 3, bgcolor: "primary.light", color: "primary.main", fontWeight: 700, textAlign: "left" }}
                >
                  Activer l&apos;assistant pour commencer
                </ButtonBase>
              )}
              <Box sx={{ display: "grid", gap: 1 }}>
                {STARTERS.map((starter) => (
                  <ButtonBase
                    key={starter}
                    onClick={() => send(starter)}
                    disabled={!aiReady || outOfQuota}
                    sx={{
                      justifyContent: "flex-start",
                      textAlign: "left",
                      p: 1.5,
                      minHeight: 48,
                      borderRadius: 3,
                      bgcolor: "background.paper",
                      color: "text.primary",
                      "&.Mui-disabled": { opacity: 0.5 },
                    }}
                  >
                    <Typography variant="body2">{starter}</Typography>
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <Box key={message.id} sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Box
                    sx={{
                      maxWidth: "85%",
                      px: 2,
                      py: 1.25,
                      borderRadius: "20px 20px 6px 20px",
                      bgcolor: "primary.light",
                      color: "text.primary",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <Typography variant="body1">{message.content}</Typography>
                  </Box>
                </Box>
              ) : (
                <Box key={message.id} sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
                  <Box
                    sx={{
                      overflowWrap: "anywhere",
                      "& p": { my: 0.75 },
                      // Les réponses se lisent comme du texte principal, pas comme une note secondaire.
                      "& .MuiTypography-root": { color: message.error ? "error.main" : "text.primary", fontSize: "1rem", lineHeight: 1.6 },
                    }}
                  >
                    <MarkdownRenderer content={message.content} />
                  </Box>
                  {message.safety && <CrisisResources compact />}
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <ChatSuggestedActionsList actions={message.suggestedActions} />
                  )}
                </Box>
              )
            )
          )}
          {isPending && <TypingDots />}
        </Box>
      </Box>

      {/* Barre de saisie : collée au clavier quand il est ouvert, au-dessus de la barre d'accueil iOS sinon */}
      <Box
        sx={{
          flex: "none",
          px: 1.5,
          pt: 1,
          pb: viewport?.keyboardOpen ? 1 : "max(12px, env(safe-area-inset-bottom, 0px))",
          bgcolor: "background.default",
        }}
      >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          sx={{
            maxWidth: 760,
            mx: "auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
            pl: 2,
            pr: 0.75,
            py: 0.75,
            borderRadius: "26px",
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            "&:focus-within": { borderColor: "primary.main" },
          }}
        >
          <InputBase
            inputRef={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={outOfQuota ? "Revenez un peu plus tard" : "Écrivez votre message"}
            multiline
            maxRows={6}
            disabled={outOfQuota}
            inputProps={{ "aria-label": "Message à l'assistant", enterKeyHint: "send" }}
            sx={{ flex: 1, py: 0.75, fontSize: 16, lineHeight: 1.4, "& textarea": { fontSize: 16 } }}
          />
          <IconButton
            type="submit"
            aria-label="Envoyer"
            disabled={!input.trim() || isPending || outOfQuota}
            sx={{
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" },
              "&.Mui-disabled": { bgcolor: "action.hover", color: "text.disabled" },
            }}
          >
            <ArrowUpwardRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <AiConsentDialog
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccepted={() => {
          setConsentOpen(false);
          refreshStatus();
          inputRef.current?.focus();
        }}
      />
    </Box>
  );
}
