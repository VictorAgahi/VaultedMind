"use client";

import { usePathname } from "next/navigation";
import React, { useRef, useEffect, useTransition } from "react";
import {
  Box,
  Fab,
  Paper,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  Avatar,
  Fade,
  CircularProgress,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { MarkdownRenderer } from "./insights-panel";
import { WhackABardella } from "./whack-a-bardella";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

interface ChatHeaderProps {
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose }) => (
  <Box
    sx={{
      pt: { xs: "calc(env(safe-area-inset-top, 0px) + 16px)", sm: 2.5 },
      pb: 2.5,
      px: 2.5,
      background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1.5,
      flexShrink: 0,
      boxShadow: "0 4px 20px rgba(79, 70, 229, 0.15)",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
        <SmartToyIcon />
      </Avatar>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            Assistant VaultedMind
          </Typography>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#10b981",
            boxShadow: "0 0 8px #10b981",
          }} />
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.75rem", mt: 0.2, display: "block" }}>
          Toujours là pour vous écouter
        </Typography>
      </Box>
    </Box>
    <IconButton
      size="small"
      onClick={onClose}
      sx={{ color: "white", display: { xs: "flex", sm: "none" } }}
    >
      <CloseIcon />
    </IconButton>
  </Box>
);



interface MessageListProps {
  messages: Message[];
  isPending: boolean;
  thinkingMessage: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isPending, thinkingMessage, scrollRef }) => (
  <Box
    ref={scrollRef}
    sx={{
      flexGrow: 1,
      p: { xs: 2, sm: 2.5 },
      overflowY: "auto",
      bgcolor: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      WebkitOverflowScrolling: "touch",
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
                width: 28,
                height: 28,
                bgcolor: msg.sender === "user" ? "secondary.main" : "primary.main",
                fontSize: "0.8rem",
                mt: 0.5
              }}
            >
              {msg.sender === "user" ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                px: 2,
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
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {msg.text}
                </Typography>
              ) : (
                <MarkdownRenderer content={msg.text} />
              )}
            </Paper>
          </Box>
        </ListItem>
      ))}
      {isPending && (
        <ListItem sx={{ p: 0, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, width: "100%" }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", mt: 0.5 }}>
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
                <CircularProgress size={14} thickness={6} sx={{ color: "primary.main" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                  Pensée artificielle...
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", lineHeight: 1.4 }}>
                {thinkingMessage}
              </Typography>
              <WhackABardella />
            </Paper>
          </Box>
        </ListItem>
      )}
    </List>
  </Box>
);

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, disabled }) => (
  <Box sx={{
    px: 2,
    pt: 2,
    pb: { xs: "calc(env(safe-area-inset-bottom, 0px) + 72px)", sm: 2 },
    bgcolor: "white",
    borderTop: "1px solid #e2e8f0",
    flexShrink: 0,
  }}>
    <Box sx={{ display: "flex", gap: 1.2, alignItems: "flex-end" }}>
      <TextField
        fullWidth
        size="small"
        multiline
        maxRows={4}
        placeholder="Posez votre question…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 4,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            transition: "all 0.2s",
            minHeight: 44,
            alignItems: "flex-end",
            pb: "10px",
            "& fieldset": { border: "none" },
            "&.Mui-focused": {
              bgcolor: "white",
              border: "1px solid",
              borderColor: "primary.main",
              boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
            },
          },
          "& .MuiInputBase-input": {
            py: 0,
            fontSize: { xs: "0.9rem", sm: "0.875rem" },
            lineHeight: 1.5,
          },
        }}
      />
      <IconButton
        onClick={onSend}
        disabled={disabled}
        sx={{
          bgcolor: value.trim() ? "primary.main" : "#f1f5f9",
          color: value.trim() ? "white" : "#94a3b8",
          transition: "all 0.2s ease-in-out",
          flexShrink: 0,
          mb: "2px",
          "&:hover": {
            bgcolor: value.trim() ? "primary.dark" : "#e2e8f0",
            transform: value.trim() ? "scale(1.05)" : "none",
          },
          "&.Mui-disabled": {
            bgcolor: "#f1f5f9",
            color: "#cbd5e1",
          },
          width: 44,
          height: 44,
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  </Box>
);

interface ChatState {
  isOpen: boolean;
  isEnabled: boolean;
  loading: boolean;
  messages: Message[];
  inputValue: string;
}

type ChatAction =
  | { type: "SET_OPEN"; payload: boolean }
  | { type: "INIT_SUCCESS"; payload: { isEnabled: boolean } }
  | { type: "INIT_FAILURE" }
  | { type: "SET_INPUT_VALUE"; payload: string }
  | { type: "SEND_MESSAGE_START"; payload: Message }
  | { type: "SEND_MESSAGE_SUCCESS"; payload: Message }
  | { type: "SEND_MESSAGE_FAILURE"; payload: Message }
  | { type: "SET_ENABLED"; payload: boolean };

const initialChatState: ChatState = {
  isOpen: false,
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
    case "SET_OPEN":
      return { ...state, isOpen: action.payload };
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

export function AIChatBot() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [state, dispatch] = React.useReducer(chatReducer, initialChatState);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [thinkingMessage, setThinkingMessage] = React.useState("L'IA réfléchit...");

  const { isOpen, isEnabled, loading, messages, inputValue } = state;

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
      dispatch({ type: "SET_OPEN", payload: true });
      dispatch({ type: "SET_INPUT_VALUE", payload: customEvent.detail.message });
    };

    window.addEventListener("ai-insights-status-changed", handleStatusChange);
    window.addEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    return () => {
      window.removeEventListener("ai-insights-status-changed", handleStatusChange);
      window.removeEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth < 600) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isAuthenticated) return null;
  if (!pathname?.startsWith("/dashboard") && !pathname?.startsWith("/analytics")) {
    return null;
  }

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

  return (!loading && isEnabled) ? (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => dispatch({ type: "SET_OPEN", payload: !isOpen })}
        sx={{
          position: "fixed",
          bottom: { xs: "calc(env(safe-area-inset-bottom, 0px) + 72px)", sm: 24 },
          right: { xs: 16, sm: 24 },
          boxShadow: "0 8px 24px rgba(216, 24, 50, 0.3)",
          zIndex: 1100,
          width: { xs: 52, sm: 56 },
          height: { xs: 52, sm: 56 },
          display: { xs: isOpen ? "none" : "flex", sm: "flex" },
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "scale(1.1) rotate(5deg)",
          }
        }}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </Fab>

      <Fade in={isOpen}>
        <Paper
          elevation={12}
          sx={{
            position: "fixed",
            bottom: { xs: 0, sm: 96 },
            right: { xs: 0, sm: 24 },
            width: { xs: "100%", sm: 380 },
            height: { xs: "100%", sm: 550 },
            maxHeight: { xs: "none", sm: 650 },
            display: "flex",
            flexDirection: "column",
            borderRadius: { xs: 0, sm: "24px" },
            overflow: "hidden",
            zIndex: 1050,
            boxShadow: { xs: "none", sm: "0 20px 48px rgba(0,0,0,0.15)" },
            top: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            border: { xs: "none", sm: "1px solid rgba(0,0,0,0.06)" }
          }}
        >
          <ChatHeader onClose={() => dispatch({ type: "SET_OPEN", payload: false })} />
          <MessageList messages={messages} isPending={isPending} thinkingMessage={thinkingMessage} scrollRef={scrollRef} />
          <ChatInput
            value={inputValue}
            onChange={(val) => dispatch({ type: "SET_INPUT_VALUE", payload: val })}
            onSend={handleSendMessage}
            disabled={!inputValue.trim() || isPending}
          />
        </Paper>
      </Fade>
    </>
  ) : null;
}
