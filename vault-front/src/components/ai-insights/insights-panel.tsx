"use client";

import { useEffect, useReducer, useSyncExternalStore, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ChatIcon from "@mui/icons-material/Chat";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { AiConsentDialog } from "./ai-consent-dialog";
import { useRouter } from "next/navigation";
import { apiService } from "@/services/api.service";
import { AIInsightResponseDto } from "@/types";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { BreathingExercise } from "./breathing-exercise";
import { ChatSuggestedActionsList, ChatSuggestedAction } from "./chat-suggested-actions";
import { useCurrentTime } from "@/utils/use-current-time";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return "Une erreur inattendue est survenue";
}

interface InsightsState {
  insights: AIInsightResponseDto[];
  loading: boolean;
  error: string | null;
  enabled: boolean;
  isGenerating: boolean;
}

type InsightsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; insights: AIInsightResponseDto[] }
  | { type: "FETCH_STATUS"; enabled: boolean; isGenerating: boolean }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "SET_GENERATING"; isGenerating: boolean }
  | { type: "DELETE_INSIGHT"; id: string };

function insightsReducer(state: InsightsState, action: InsightsAction): InsightsState {
  switch (action.type) {
    case "FETCH_START": return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS": return { ...state, insights: action.insights, loading: false, error: null };
    case "FETCH_STATUS": return { ...state, enabled: action.enabled, isGenerating: action.isGenerating, loading: false };
    case "FETCH_ERROR": return { ...state, loading: false, error: action.error };
    case "SET_ENABLED": return { ...state, enabled: action.enabled };
    case "SET_GENERATING": return { ...state, isGenerating: action.isGenerating };
    case "DELETE_INSIGHT": return { ...state, insights: state.insights.filter((i) => i.id !== action.id) };
    default: return state;
  }
}

const insightTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Résumé quotidien",
  WEEKLY_TREND: "Tendances hebdo",
  ANOMALY: "Anomalie",
  RECOMMENDATION: "Conseil",
};

// ─── Markdown renderer ────────────────────────────────────────────────────────

type MdToken =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "numbered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "hr" };

function parseMarkdown(content: string): MdToken[] {
  const lines = content.split("\n");
  const tokens: MdToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i++; continue; }

    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.startsWith("### ")) { tokens.push({ type: "h3", text: line.slice(4) }); i++; continue; }
    if (line.startsWith("## ")) { tokens.push({ type: "h2", text: line.slice(3) }); i++; continue; }
    if (line.startsWith("# ")) { tokens.push({ type: "h1", text: line.slice(2) }); i++; continue; }

    if (line.startsWith("> ")) {
      tokens.push({ type: "blockquote", text: line.slice(2) });
      i++;
      continue;
    }

    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      tokens.push({ type: "bullet-list", items });
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i++;
      }
      tokens.push({ type: "numbered-list", items });
      continue;
    }

    tokens.push({ type: "paragraph", text: line });
    i++;
  }

  return tokens;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <Box key={idx} component="span" sx={{ fontWeight: 800, color: "var(--mui-palette-text-primary)" }}>{part.slice(2, -2)}</Box>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <Box key={idx} component="span" sx={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Box>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <Box key={idx} component="code" sx={{ bgcolor: "var(--mui-palette-divider)", borderRadius: 1, px: 0.5, fontFamily: "monospace", fontSize: "0.85em" }}>{part.slice(1, -1)}</Box>;
    return part;
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  const tokens = parseMarkdown(content);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {tokens.map((token, idx) => {
        const key = `md-${idx}`;

        if (token.type === "hr")
          return <Box key={key} sx={{ borderTop: "1px solid var(--mui-palette-divider)", my: 0.5 }} />;

        if (token.type === "h1")
          return (
            <Typography key={key} variant="h6" sx={{ fontWeight: 800, color: "var(--mui-palette-text-primary)", mt: 1, lineHeight: 1.3, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "h2")
          return (
            <Typography key={key} variant="subtitle1" sx={{ fontWeight: 800, color: "var(--mui-palette-text-primary)", mt: 0.5, lineHeight: 1.4, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "h3")
          return (
            <Typography key={key} variant="subtitle2" sx={{ color: "text.primary", mt: 0.5 }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "blockquote")
          return (
            <Box
              key={key}
              sx={{
                borderLeft: "3px solid var(--mui-palette-primary-main)",
                pl: 1.5,
                py: 0.5,
                bgcolor: "rgba(var(--mui-palette-primary-mainChannel) / 0.04)",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <Typography variant="body2" sx={{ color: "var(--mui-palette-text-secondary)", fontStyle: "italic", lineHeight: 1.6, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                {renderInline(token.text)}
              </Typography>
            </Box>
          );

        if (token.type === "bullet-list")
          return (
            <Box key={key} component="ul" sx={{ m: 0, pl: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {token.items.map((item, ii) => (
                <Box key={ii} component="li" sx={{ color: "var(--mui-palette-text-secondary)" }}>
                  <Typography variant="body2" component="span" sx={{ lineHeight: 1.6, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                    {renderInline(item)}
                  </Typography>
                </Box>
              ))}
            </Box>
          );

        if (token.type === "numbered-list")
          return (
            <Box key={key} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {token.items.map((item, ii) => (
                <Box key={ii} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      bgcolor: "var(--mui-palette-primary-main)",
                      color: "primary.contrastText",
                      fontWeight: 800,
                      borderRadius: "50%",
                      minWidth: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      flexShrink: 0,
                      mt: 0.2,
                    }}
                  >
                    {ii + 1}
                  </Box>
                  <Typography variant="body2" sx={{ color: "var(--mui-palette-text-secondary)", lineHeight: 1.6, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
                    {renderInline(item)}
                  </Typography>
                </Box>
              ))}
            </Box>
          );

        return (
          <Typography key={key} variant="body2" sx={{ color: "var(--mui-palette-text-secondary)", lineHeight: 1.7, fontSize: { xs: "0.82rem", sm: "0.875rem" } }}>
            {renderInline(token.text)}
          </Typography>
        );
      })}
    </Box>
  );
}

// ─── Suggested Fields ─────────────────────────────────────────────────────────

interface SuggestedField {
  name: string;
  fieldType?: "STRING" | "NUMBER" | "BOOLEAN" | "DATE";
  category?: string;
  options?: string[];
  reason?: string;
}

function SuggestedFieldsList({ suggestedFields, onAccept }: { suggestedFields: SuggestedField[]; onAccept: (field: SuggestedField) => void }) {
  if (!suggestedFields || suggestedFields.length === 0) return null;

  const grouped = suggestedFields.reduce((acc, field) => {
    const cat = field.category || "Général";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(field);
    return acc;
  }, {} as Record<string, SuggestedField[]>);

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed var(--mui-palette-divider)" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mb: 1, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 0.5 }}>
         L&apos;IA vous suggère d&apos;ajouter ces champs :
      </Typography>
      <Stack spacing={2}>
        {Object.entries(grouped).map(([category, fieldsList]) => {
          const fields = fieldsList as SuggestedField[];
          return (
            <Box key={category}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mb: 1, display: "block" }}>
                {category}
              </Typography>
              <Stack spacing={1}>
                {fields.map((field, idx) => (
                <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "var(--mui-palette-grey-100)", p: 1.5, borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-text-primary)" }}>{field.name}</Typography>
                    <Typography variant="caption" sx={{ color: "var(--mui-palette-text-secondary)", display: "block", lineHeight: 1.2 }}>{field.reason}</Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onAccept(field)}
                    sx={{
                      bgcolor: "var(--mui-palette-primary-dark)",
                      color: "primary.contrastText",
                      fontSize: "0.7rem",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      textTransform: "none",
                      boxShadow: "none",
                      "&:hover": { bgcolor: "var(--mui-palette-primary-dark)", boxShadow: "none" }
                    }}
                  >
                    Accepter
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  isMounted,
  onDelete,
  isEnabled,
}: {
  insight: AIInsightResponseDto;
  isMounted: boolean;
  onDelete: (id: string) => void;
  isEnabled: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<string[]>([]);

  const handleAcceptField = async (field: SuggestedField) => {
    try {
      // Map AI suggested field to DTO format
      const dto = {
        name: field.name,
        fieldType: field.fieldType || "NUMBER",
        category: field.category || "Général",
        optionsOrder: field.options,
        rememberLastValue: true, // Default to true for ease of use
      };
      await apiService.post("/health/custom-fields", dto);
      setAcceptedFields((prev) => [...prev, field.name]);
      
      // Dispatch event to refresh custom fields in other components
      window.dispatchEvent(new CustomEvent("custom-fields-updated"));
    } catch (error) {
      console.error("Failed to accept field:", error);
      alert("Erreur lors de l'ajout du champ.");
    }
  };

  const dateStr = isMounted
    ? new Date(insight.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  const handleAskAI = () => {
    const question = `En te basant sur cette analyse "${insight.title}", peux-tu m'expliquer davantage et me donner des conseils pratiques ?`;
    router.push(`/ai/chat?prompt=${encodeURIComponent(question)}`);
  };

  return (
    <Card
      sx={{
        borderRadius: { xs: 3, sm: 4 },
        bgcolor: "action.hover",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, "&:last-child": { pb: { xs: 2, sm: 3 } } }}>
        {/* Badge + delete row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              bgcolor: "rgba(var(--mui-palette-primary-mainChannel) / 0.08)",
              color: "var(--mui-palette-primary-dark)",
              fontWeight: 700,
              px: 1.2,
              py: 0.4,
              borderRadius: 2,
              fontSize: "0.7rem",
            }}
          >
            {insightTypeLabels[insight.type] || insight.type.replace(/_/g, " ")}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onDelete(insight.id)}
            sx={{ color: "var(--mui-palette-text-disabled)", p: 0.5, "&:hover": { color: "var(--mui-palette-error-main)", bgcolor: "rgba(var(--mui-palette-error-mainChannel) / 0.05)" } }}
          >
            <DeleteIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>

        {/* Title */}
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "var(--mui-palette-text-primary)", mb: 1.5, fontSize: { xs: "0.95rem", sm: "1rem" }, lineHeight: 1.35 }}>
          {insight.title}
        </Typography>

        {/* Content — collapsible */}
        <Collapse in={expanded} collapsedSize={80}>
          <MarkdownRenderer content={insight.content} />
          {expanded && !!insight.metadata?.actionSuggestions && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed var(--mui-palette-divider)" }}>
              <ChatSuggestedActionsList actions={insight.metadata.actionSuggestions as ChatSuggestedAction[]} />
            </Box>
          )}
          {expanded && !!insight.metadata?.suggestedFields && (
            <SuggestedFieldsList
              suggestedFields={
                Array.isArray(insight.metadata.suggestedFields)
                  ? insight.metadata.suggestedFields.filter((f: SuggestedField) => !acceptedFields.includes(f.name))
                  : []
              }
              onAccept={handleAcceptField}
            />
          )}
        </Collapse>

        {/* Footer */}
        <Box sx={{ mt: 1.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: { xs: 1, sm: 0 }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
          <Typography variant="caption" sx={{ color: "var(--mui-palette-text-disabled)", fontSize: "0.72rem" }}>
            {dateStr}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: { xs: "space-between", sm: "flex-end" } }}>
            {isEnabled && (
              <Button
                size="small"
                startIcon={<ChatIcon sx={{ fontSize: "0.8rem !important" }} />}
                onClick={handleAskAI}
                sx={{
                  color: "var(--mui-palette-primary-dark)",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  textTransform: "none",
                  bgcolor: "rgba(var(--mui-palette-primary-mainChannel) / 0.06)",
                  borderRadius: 2,
                  px: 1.2,
                  py: 0.5,
                  flex: { xs: 1, sm: "none" },
                  "&:hover": { bgcolor: "rgba(var(--mui-palette-primary-mainChannel) / 0.12)" },
                }}
              >
                Demander à l&apos;IA
              </Button>
            )}
            <Button
              size="small"
              onClick={() => setExpanded((v) => !v)}
              endIcon={expanded ? <ExpandLessIcon sx={{ fontSize: "0.9rem !important" }} /> : <ExpandMoreIcon sx={{ fontSize: "0.9rem !important" }} />}
              sx={{
                color: "var(--mui-palette-primary-main)",
                fontWeight: 700,
                fontSize: "0.72rem",
                textTransform: "none",
                flex: { xs: 1, sm: "none" },
              }}
            >
              {expanded ? "Réduire" : "Tout lire"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── InsightsPanel ────────────────────────────────────────────────────────────

export function InsightsPanel() {
  const router = useRouter();
  const [state, dispatch] = useReducer(insightsReducer, {
    insights: [],
    loading: true,
    error: null,
    enabled: false,
    isGenerating: false,
  });
  const [openConfirm, setOpenConfirm] = useState(false);

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const init = async () => {
      try {
        dispatch({ type: "FETCH_START" });
        const { enabled, isGenerating } = await apiService.get<{ enabled: boolean, isGenerating: boolean }>("/health/ai-insights/status");
        dispatch({ type: "FETCH_STATUS", enabled, isGenerating });
        if (enabled) {
          const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
          dispatch({ type: "FETCH_SUCCESS", insights });
        }
      } catch (error: unknown) {
        dispatch({ type: "FETCH_ERROR", error: getErrorMessage(error) });
      }
    };
    init();
  }, []);

  // Poll generation status if it's currently generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isGenerating) {
      interval = setInterval(async () => {
        try {
          const { isGenerating } = await apiService.get<{ isGenerating: boolean }>("/health/ai-insights/status");
          if (!isGenerating) {
            dispatch({ type: "SET_GENERATING", isGenerating: false });
            const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
            dispatch({ type: "FETCH_SUCCESS", insights });
          }
        } catch (error) {
          console.error("Erreur polling status:", error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [state.isGenerating]);

  const toggleAIInsights = async (value: boolean) => {
    if (value) {
      setOpenConfirm(true);
    } else {
      try {
        await apiService.post("/health/ai-insights/disable");
        dispatch({ type: "SET_ENABLED", enabled: false });
        window.dispatchEvent(new CustomEvent("ai-insights-status-changed", { detail: { enabled: false } }));
      } catch (error: unknown) {
        console.error("Erreur lors de la désactivation :", getErrorMessage(error));
      }
    }
  };

  // Le consentement est enregistré par AiConsentDialog avant cet appel.
  const confirmEnable = async () => {
    try {
      dispatch({ type: "SET_ENABLED", enabled: true });
      setOpenConfirm(false);
      const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
      dispatch({ type: "FETCH_SUCCESS", insights });
    } catch (error: unknown) {
      console.error("Erreur lors de l'activation :", getErrorMessage(error));
    }
  };

  const deleteInsight = async (id: string) => {
    try {
      await apiService.delete(`/health/ai-insights/${id}`);
      dispatch({ type: "DELETE_INSIGHT", id });
    } catch (error: unknown) {
      console.error("Erreur lors de la suppression :", getErrorMessage(error));
    }
  };

  const currentTime = useCurrentTime();

  const getCooldownInfo = () => {
    if (state.insights.length === 0 || currentTime === 0) return { active: false, text: "" };
    const latest = state.insights[0];
    const diffMs = currentTime - new Date(latest.createdAt).getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (diffMs < twelveHoursMs) {
      const remainingMs = twelveHoursMs - diffMs;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const text = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
      return { active: true, text };
    }
    return { active: false, text: "" };
  };

  const cooldown = getCooldownInfo();

  return (
    <Box
      sx={{
        width: "100%",
        mt: 3,
        bgcolor: "background.paper",
        borderRadius: 4,
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon sx={{ color: "var(--mui-palette-warning-main)", fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-text-primary)", fontSize: { xs: "1rem", sm: "1.1rem" } }}>
            Analyses par IA
          </Typography>
          {state.insights.length > 0 && (
            <Box sx={{ bgcolor: "var(--mui-palette-divider)", color: "var(--mui-palette-text-secondary)", fontWeight: 700, px: 1, py: 0.2, borderRadius: 10, fontSize: "0.7rem" }}>
              {state.insights.length}
            </Box>
          )}
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={state.enabled}
              onChange={(e) => toggleAIInsights(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="caption" sx={{ fontWeight: 600, color: state.enabled ? "var(--mui-palette-success-main)" : "var(--mui-palette-text-disabled)" }}>
              {state.enabled ? "Activé" : "Désactivé"}
            </Typography>
          }
          sx={{ mr: 0 }}
        />
      </Box>

      {/* Contexte limites */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, mb: 2, bgcolor: "rgba(148,163,184,0.08)", borderRadius: 2, p: 1.2 }}>
        <Tooltip title="Vous pouvez déclencher un bilan vous-même toutes les 12h. L'IA analyse vos entrées récentes pour synthétiser vos tendances." arrow>
          <InfoOutlinedIcon sx={{ fontSize: "0.85rem", color: "var(--mui-palette-text-disabled)", mt: "1px", flexShrink: 0, cursor: "help" }} />
        </Tooltip>
        <Typography variant="caption" sx={{ color: "var(--mui-palette-text-secondary)", lineHeight: 1.5, fontSize: "0.72rem" }}>
          Analyses à la demande, basées sur vos 30 derniers journaux. <strong>Un bilan toutes les 12 h au maximum.</strong>
        </Typography>
      </Box>

      {!state.enabled && (
        <Alert severity="info" sx={{ mb: 2, bgcolor: "var(--mui-palette-action-hover)", fontSize: { xs: "0.82rem", sm: "0.875rem" }, "& .MuiAlert-icon": { color: "var(--mui-palette-info-main)" } }}>
          Activez les analyses pour recevoir un suivi personnalisé de votre bien-être.
        </Alert>
      )}

      {state.enabled && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, mb: 1, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={state.isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              disabled={state.isGenerating || cooldown.active}
              onClick={() => {
                dispatch({ type: "SET_GENERATING", isGenerating: true });
                apiService.post("/health/ai-insights/generate")
                  .then(async () => {
                    window.dispatchEvent(new CustomEvent("ai-insights-updated"));
                    const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
                    dispatch({ type: "FETCH_SUCCESS", insights });
                    dispatch({ type: "SET_GENERATING", isGenerating: false });
                  })
                  .catch((error: unknown) => {
                    console.error("Erreur de génération :", getErrorMessage(error));
                    dispatch({ type: "SET_GENERATING", isGenerating: false });
                  });
              }}
              sx={{
                bgcolor: cooldown.active ? "var(--mui-palette-text-disabled)" : "var(--mui-palette-primary-dark)",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: "0.82rem",
                boxShadow: cooldown.active ? "none" : "0 4px 12px rgba(var(--mui-palette-primary-mainChannel) / 0.25)",
                "&:hover": { bgcolor: "var(--mui-palette-primary-dark)" },
                "&.Mui-disabled": { bgcolor: "var(--mui-palette-divider)", color: "var(--mui-palette-text-secondary)" },
              }}
            >
              {state.isGenerating
                ? "Génération en cours..."
                : cooldown.active
                ? `Prochaine review dans ${cooldown.text}`
                : "Lancer mon bilan"}
            </Button>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => router.push("/ai/chat")}
              sx={{
                borderColor: "var(--mui-palette-primary-dark)",
                color: "var(--mui-palette-primary-dark)",
                fontWeight: 700,
                fontSize: "0.82rem",
                "&:hover": { borderColor: "var(--mui-palette-primary-dark)", bgcolor: "rgba(var(--mui-palette-primary-mainChannel) / 0.04)" }
              }}
            >
              Discuter avec l&apos;IA
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={async () => {
                try {
                  dispatch({ type: "FETCH_START" });
                  const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
                  dispatch({ type: "FETCH_SUCCESS", insights });
                } catch (error: unknown) {
                  dispatch({ type: "FETCH_ERROR", error: getErrorMessage(error) });
                }
              }}
              sx={{
                borderColor: "var(--mui-palette-divider)",
                color: "var(--mui-palette-text-secondary)",
                fontSize: "0.82rem",
                "&:hover": { borderColor: "var(--mui-palette-text-disabled)", bgcolor: "var(--mui-palette-grey-100)" }
              }}
            >
              Actualiser
            </Button>
          </Box>
        </Box>
      )}

      {state.isGenerating && (
        <Box sx={{ mb: 2 }}>
          <BreathingExercise />
        </Box>
      )}

      {state.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : state.error ? (
        <Alert severity="error" sx={{ fontSize: "0.82rem" }}>{state.error}</Alert>
      ) : state.insights.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: "var(--mui-palette-action-hover)", fontSize: "0.82rem", "& .MuiAlert-icon": { color: "var(--mui-palette-info-main)" } }}>
          Pas encore d&apos;analyses. Elles sont générées chaque jeudi à 21h.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {state.insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              isMounted={isMounted}
              onDelete={deleteInsight}
              isEnabled={state.enabled}
            />
          ))}
        </Stack>
      )}

      <AiConsentDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onAccepted={confirmEnable}
      />
    </Box>
  );
}
