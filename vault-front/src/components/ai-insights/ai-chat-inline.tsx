"use client";

import React, { useRef, useEffect, useTransition } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  Alert
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { MarkdownRenderer } from "./insights-panel";
import { WhackABardella } from "./whack-a-bardella";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

interface ChatState {
  isEnabled: boolean;
  loading: boolean;
  messages: Message[];
  inputValue: string;
}

type ChatAction =
  | { type: "INIT_SUCCESS"; payload: { isEnabled: boolean } }
  | { type: "INIT_FAILURE" }
  | { type: "SET_INPUT_VALUE"; payload: string }
  | { type: "SEND_MESSAGE_START"; payload: Message }
  | { type: "SEND_MESSAGE_SUCCESS"; payload: Message }
  | { type: "SEND_MESSAGE_FAILURE"; payload: Message }
  | { type: "SET_ENABLED"; payload: boolean };

const initialChatState: ChatState = {
  isEnabled: false,
  loading: true,
  messages: [
    {
      id: "1",
      text: "Bonjour ! Je suis votre assistant VaultedMind. Comment puis-je vous aider aujourd'hui ?",
      sender: "ai",
    },
  ],
  inputValue: "",
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "INIT_SUCCESS":
      return { ...state, isEnabled: action.payload.isEnabled, loading: false };
    case "INIT_FAILURE":
      return { ...state, loading: false };
    case "SET_INPUT_VALUE":
      return { ...state, inputValue: action.payload };
    case "SEND_MESSAGE_START":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        inputValue: "",
      };
    case "SEND_MESSAGE_SUCCESS":
    case "SEND_MESSAGE_FAILURE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "SET_ENABLED":
      return { ...state, isEnabled: action.payload };
    default:
      return state;
  }
}

const JOKES = [
  "L'IA réfléchit... (sans caféine, elle a du mérite)",
  "Analyse de vos données... (promis, je ne juge pas votre heure de coucher)",
  "Calcul des corrélations... Est-ce que le café explique tout ?",
  "Recherche de patterns... (Mes neurones surchauffent un peu, un instant)",
  "Consultation de la data... (Presque plus rapide qu'un médecin, et sans salle d'attente)",
  "Déchiffrement de vos journaux... (Vos notes sont passionnantes !)",
  "Croisement des variables... Est-ce les migraines ou la pleine lune ?",
  "Un instant, j'interroge ma base de connaissances neuronale...",
  "Traitement en cours... (Et non, je ne lis pas dans vos pensées, seulement vos logs)"
];

export function AIChatInline() {
  const { isAuthenticated } = useAuth();
  const [state, dispatch] = React.useReducer(chatReducer, initialChatState);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [thinkingMessage, setThinkingMessage] = React.useState("L'IA réfléchit...");

  const { isEnabled, loading, messages, inputValue } = state;

  useEffect(() => {
    if (isPending) {
      const interval = setInterval(() => {
        const nextJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
        setThinkingMessage(nextJoke);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [isPending]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkStatus = async () => {
      try {
        const { enabled } = await apiService.get<{ enabled: boolean }>("/health/ai-insights/status");
        dispatch({ type: "INIT_SUCCESS", payload: { isEnabled: enabled } });
      } catch (err) {
        console.error("Failed to check AI status for chatbot", err);
        dispatch({ type: "INIT_FAILURE" });
      }
    };

    checkStatus();

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      dispatch({ type: "SET_ENABLED", payload: customEvent.detail.enabled });
    };

    const handleOpenWithMessage = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      dispatch({ type: "SET_INPUT_VALUE", payload: customEvent.detail.message });
      // On inline chat, we might want to auto-send it if they click "Ask AI" from an insight.
      // For now, let's just populate the input.
    };

    window.addEventListener("ai-insights-status-changed", handleStatusChange);
    window.addEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    return () => {
      window.removeEventListener("ai-insights-status-changed", handleStatusChange);
      window.removeEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isPending) return;

    const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
    setThinkingMessage(randomJoke);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
    };

    dispatch({ type: "SEND_MESSAGE_START", payload: userMsg });

    startTransition(async () => {
      try {
        const { response } = await apiService.post<{ response: string }>(
          "/health/ai-chat",
          { message: inputValue }
        );

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: "ai",
        };

        dispatch({ type: "SEND_MESSAGE_SUCCESS", payload: aiMsg });
      } catch (_error) {
        console.log(_error);
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: "Désolé, je rencontre une erreur de connexion. Veuillez réessayer.",
          sender: "ai",
        };
        dispatch({ type: "SEND_MESSAGE_FAILURE", payload: errorMsg });
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isEnabled) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        L&apos;assistant IA est désactivé. Veuillez l&apos;activer dans les paramètres ou l&apos;onglet Analyses.
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100vh - 250px)", md: "600px" },
        border: "1px solid #e2e8f0",
        borderRadius: { xs: 3, sm: 4 },
        overflow: "hidden",
        bgcolor: "#f8fafc",
      }}
    >
      {/* Messages area */}
      <Box
        ref={scrollRef}
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.06)",
            borderRadius: 3,
            "&:hover": { bgcolor: "rgba(0,0,0,0.12)" }
          }
        }}
      >
        <List sx={{ p: 0 }}>
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              sx={{
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                p: 0,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: msg.sender === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                  gap: 1.2,
                  maxWidth: "85%",
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: msg.sender === "user" ? "secondary.main" : "primary.main",
                    fontSize: "0.9rem",
                    mt: 0.5
                  }}
                >
                  {msg.sender === "user" ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: msg.sender === "user" ? "16px 16px 0px 16px" : "16px 16px 16px 0px",
                    bgcolor: msg.sender === "user" ? "primary.main" : "white",
                    color: msg.sender === "user" ? "white" : "text.primary",
                    border: msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    boxShadow: msg.sender === "user" ? "0 4px 12px rgba(99, 102, 241, 0.15)" : "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  {msg.sender === "user" ? (
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {msg.text}
                    </Typography>
                  ) : (
                    <Box sx={{ "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } }, "& ul, & ol": { mt: 0, mb: 1, pl: 2 } }}>
                      <MarkdownRenderer content={msg.text} />
                    </Box>
                  )}
                </Paper>
              </Box>
            </ListItem>
          ))}
          {isPending && (
            <ListItem sx={{ p: 0, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.2, width: "100%" }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", mt: 0.5 }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "16px 16px 16px 0px",
                    bgcolor: "white",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    maxWidth: "80%",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={16} thickness={5} sx={{ color: "primary.main" }} />
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                      Pensée artificielle...
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", lineHeight: 1.4 }}>
                    {thinkingMessage}
                  </Typography>
                  <WhackABardella />
                </Paper>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      {/* Input area */}
      <Box sx={{
        p: 2,
        bgcolor: "white",
        borderTop: "1px solid #e2e8f0",
      }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="Posez votre question à l&apos;IA..."
            value={inputValue}
            onChange={(e) => dispatch({ type: "SET_INPUT_VALUE", payload: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 4,
                bgcolor: "#f8fafc",
                transition: "all 0.2s",
                "& fieldset": { borderColor: "#e2e8f0" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
                "&.Mui-focused": {
                  bgcolor: "white",
                  "& fieldset": { borderColor: "primary.main" },
                  boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)",
                },
              },
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isPending}
            sx={{
              bgcolor: inputValue.trim() ? "primary.main" : "#f1f5f9",
              color: inputValue.trim() ? "white" : "#94a3b8",
              transition: "all 0.2s ease-in-out",
              mb: 0.5,
              "&:hover": {
                bgcolor: inputValue.trim() ? "primary.dark" : "#e2e8f0",
                transform: inputValue.trim() ? "scale(1.05)" : "none",
              },
              "&.Mui-disabled": {
                bgcolor: "#f1f5f9",
                color: "#cbd5e1",
              },
              width: 48,
              height: 48,
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
