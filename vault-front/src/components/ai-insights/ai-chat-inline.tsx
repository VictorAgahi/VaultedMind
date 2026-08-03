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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Button
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { MarkdownRenderer } from "./insights-panel";
import { WhackABardella } from "./whack-a-bardella";

export interface ChatSuggestedAction {
  type: "CREATE_FIELD" | "DEACTIVATE_FIELD" | "UPDATE_CATEGORY";
  id?: string;
  name: string;
  fieldType?: string;
  category?: string;
  options?: string[];
  reason?: string;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  suggestedActions?: ChatSuggestedAction[];
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

export function ChatSuggestedActionsList({ actions }: { actions: ChatSuggestedAction[] }) {
  const [completed, setCompleted] = React.useState<string[]>([]);
  const [selectedAction, setSelectedAction] = React.useState<{ action: ChatSuggestedAction, idx: number, editedOptions?: string[] } | null>(null);
  
  const handleApply = async (action: ChatSuggestedAction, idx: number, editedOptions?: string[]) => {
    try {
      if (action.type === "CREATE_FIELD") {
        let cleanFieldType = (action.fieldType || "STRING").toUpperCase();
        if (cleanFieldType === "TEXT") cleanFieldType = "STRING";
        if (!["STRING", "NUMBER", "BOOLEAN", "DATE"].includes(cleanFieldType)) {
          cleanFieldType = "STRING";
        }
        
        await apiService.post("/health/custom-fields", {
          name: action.name,
          fieldType: cleanFieldType,
          category: action.category || "Général",
          optionsOrder: editedOptions !== undefined ? editedOptions : action.options,
          rememberLastValue: true,
        });
      } else if (action.type === "DEACTIVATE_FIELD" && action.id) {
        await apiService.patch(`/health/custom-fields/${action.id}`, {
          isActive: false,
        });
      } else if (action.type === "UPDATE_CATEGORY" && action.id) {
        await apiService.patch(`/health/custom-fields/${action.id}`, {
          category: action.category,
        });
      }
      setCompleted(prev => [...prev, String(idx)]);
      setSelectedAction(null);
      window.dispatchEvent(new CustomEvent("custom-fields-updated"));
    } catch (e) {
      console.error("Failed to apply AI action:", e);
      alert("Erreur lors de l'application de l'action.");
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", textTransform: "uppercase" }}>
        ✨ Actions Suggérées ({actions.length - completed.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {actions.map((action, idx) => {
          const isDone = completed.includes(String(idx));
          if (isDone) return null;
          
          let label = action.name;
          if (action.type === "DEACTIVATE_FIELD") label = `Désactiver ${action.name}`;
          
          return (
            <Chip
              key={idx}
              label={label}
              onClick={() => setSelectedAction({ action, idx, editedOptions: action.options ? [...action.options] : undefined })}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 500, bgcolor: 'rgba(99, 102, 241, 0.05)', borderColor: 'primary.main' }}
            />
          );
        })}
      </Box>

      <Dialog 
        open={Boolean(selectedAction)} 
        onClose={() => setSelectedAction(null)}
        maxWidth="sm"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
      >
        {selectedAction && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              {selectedAction.action.type === "CREATE_FIELD" && "Créer un nouveau champ"}
              {selectedAction.action.type === "DEACTIVATE_FIELD" && "Désactiver le champ"}
              {selectedAction.action.type === "UPDATE_CATEGORY" && "Mettre à jour la catégorie"}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                {selectedAction.action.name}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedAction.action.type === "CREATE_FIELD" && (
                  <>
                    <Typography variant="body2">
                      <strong>Type :</strong> {selectedAction.action.fieldType}
                    </Typography>
                    {selectedAction.editedOptions && selectedAction.editedOptions.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Options suggérées (cliquez pour retirer) :</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {selectedAction.editedOptions.map((opt, i) => (
                            <Chip 
                              key={i} 
                              label={opt} 
                              onDelete={() => {
                                setSelectedAction(prev => {
                                  if (!prev || !prev.editedOptions) return prev;
                                  return { ...prev, editedOptions: prev.editedOptions.filter((_, index) => index !== i) };
                                });
                              }} 
                              color="primary" 
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
                {selectedAction.action.category && (
                  <Typography variant="body2">
                    <strong>Catégorie :</strong> {selectedAction.action.category}
                  </Typography>
                )}
                {selectedAction.action.reason && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Pourquoi cette suggestion ?
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      &quot;{selectedAction.action.reason}&quot;
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelectedAction(null)} color="inherit">
                Retour
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => handleApply(selectedAction.action, selectedAction.idx, selectedAction.editedOptions)}
                endIcon={<SendIcon />}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Appliquer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

import { useSearchParams } from "next/navigation";

export function AIChatInline() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");
  const [state, dispatch] = React.useReducer(chatReducer, initialChatState);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const hasAutoPrompted = useRef(false);
  
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
    };

    window.addEventListener("ai-insights-status-changed", handleStatusChange);
    window.addEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    return () => {
      window.removeEventListener("ai-insights-status-changed", handleStatusChange);
      window.removeEventListener("ai-chat-open-with-message", handleOpenWithMessage);
    };
  }, [isAuthenticated]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const textToSend = overrideMessage || inputValue;
    if (!textToSend.trim() || isPending) return;

    const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
    setThinkingMessage(randomJoke);

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: "user",
    };

    dispatch({ type: "SEND_MESSAGE_START", payload: userMsg });

    startTransition(async () => {
      try {
        const { response, suggestedActions } = await apiService.post<{ response: string; suggestedActions?: ChatSuggestedAction[] }>(
          "/health/ai-chat",
          { message: textToSend }
        );

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: "ai",
          suggestedActions,
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

  useEffect(() => {
    if (isEnabled && initialPrompt && !hasAutoPrompted.current) {
      hasAutoPrompted.current = true;
      dispatch({ type: "SET_INPUT_VALUE", payload: initialPrompt });
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, initialPrompt]);

  if (!isAuthenticated) return null;



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
        height: { xs: "calc(100dvh - 160px - env(safe-area-inset-top) - env(safe-area-inset-bottom))", md: "600px" },
        mt: { xs: "env(safe-area-inset-top)", md: 0 },
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
          px: { xs: 1, sm: 2 },
          py: { xs: 2, sm: 3 },
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
                  maxWidth: { xs: "95%", sm: "85%" },
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
                      {msg.suggestedActions && <ChatSuggestedActionsList actions={msg.suggestedActions} />}
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
                    maxWidth: { xs: "92%", sm: "80%" },
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
        px: 2,
        pt: 2,
        pb: { xs: "calc(env(safe-area-inset-bottom) + 16px)", md: 2 },
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
            onClick={() => handleSendMessage()}
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
