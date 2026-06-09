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
      pt: { xs: "calc(env(safe-area-inset-top, 0px) + 16px)", sm: 2 },
      pb: 2,
      px: 2,
      bgcolor: "primary.main",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1.5,
      flexShrink: 0,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
        <SmartToyIcon />
      </Avatar>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          Assistant VaultedMind
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
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
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isPending, scrollRef }) => (
  <Box
    ref={scrollRef}
    sx={{
      flexGrow: 1,
      p: { xs: 1.5, sm: 2 },
      overflowY: "auto",
      bgcolor: "#f9fafb",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      WebkitOverflowScrolling: "touch",
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
              alignItems: "flex-end",
              gap: 1,
              maxWidth: "85%",
            }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: msg.sender === "user" ? "secondary.main" : "primary.main",
                fontSize: "0.8rem",
              }}
            >
              {msg.sender === "user" ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.sender === "user" ? "primary.main" : "white",
                color: msg.sender === "user" ? "white" : "text.primary",
                border: msg.sender === "user" ? "none" : "1px solid #e5e7eb",
                borderBottomLeftRadius: msg.sender === "ai" ? 0 : 2,
                borderBottomRightRadius: msg.sender === "user" ? 0 : 2,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {msg.text}
              </Typography>
            </Paper>
          </Box>
        </ListItem>
      ))}
      {isPending && (
        <ListItem sx={{ p: 0, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper
              elevation={0}
              sx={{ p: 1.5, borderRadius: 2, bgcolor: "white", border: "1px solid #e5e7eb" }}
            >
              <CircularProgress size={16} thickness={5} />
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
    px: 1.5,
    pt: 1.5,
    pb: { xs: "calc(env(safe-area-inset-bottom, 0px) + 72px)", sm: 1.5 },
    bgcolor: "white",
    borderTop: "1px solid #e5e7eb",
    flexShrink: 0,
  }}>
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
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
            borderRadius: 3,
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
              boxShadow: "0 0 0 3px rgba(216,24,50,0.08)",
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

export function AIChatBot() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [state, dispatch] = React.useReducer(chatReducer, initialChatState);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isOpen, isEnabled, loading, messages, inputValue } = state;

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
            height: { xs: "100%", sm: 500 },
            maxHeight: { xs: "none", sm: 600 },
            display: "flex",
            flexDirection: "column",
            borderRadius: { xs: 0, sm: 3 },
            overflow: "hidden",
            zIndex: 1050,
            boxShadow: { xs: "none", sm: "0 12px 48px rgba(0,0,0,0.15)" },
            top: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
          }}
        >
          <ChatHeader onClose={() => dispatch({ type: "SET_OPEN", payload: false })} />
          <MessageList messages={messages} isPending={isPending} scrollRef={scrollRef} />
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
