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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ChatIcon from "@mui/icons-material/Chat";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { apiService } from "@/services/api.service";
import { AIInsightResponseDto } from "@/types";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

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
}

type InsightsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; insights: AIInsightResponseDto[] }
  | { type: "FETCH_STATUS"; enabled: boolean }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "DELETE_INSIGHT"; id: string };

function insightsReducer(state: InsightsState, action: InsightsAction): InsightsState {
  switch (action.type) {
    case "FETCH_START": return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS": return { ...state, insights: action.insights, loading: false, error: null };
    case "FETCH_STATUS": return { ...state, enabled: action.enabled, loading: false };
    case "FETCH_ERROR": return { ...state, loading: false, error: action.error };
    case "SET_ENABLED": return { ...state, enabled: action.enabled };
    case "DELETE_INSIGHT": return { ...state, insights: state.insights.filter((i) => i.id !== action.id) };
    default: return state;
  }
}

const insightTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Résumé quotidien",
  WEEKLY_TREND: "Tendances hebdomadaires",
  ANOMALY: "Anomalie détectée",
  RECOMMENDATION: "Recommandation",
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
  // Handle **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <Box key={idx} component="span" sx={{ fontWeight: 800, color: "#1e293b" }}>{part.slice(2, -2)}</Box>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <Box key={idx} component="span" sx={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Box>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <Box key={idx} component="code" sx={{ bgcolor: "rgba(0,0,0,0.06)", borderRadius: 1, px: 0.5, fontFamily: "monospace", fontSize: "0.85em" }}>{part.slice(1, -1)}</Box>;
    return part;
  });
}

function MarkdownRenderer({ content }: { content: string }) {
  const tokens = parseMarkdown(content);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {tokens.map((token, idx) => {
        const key = `md-${idx}`;

        if (token.type === "hr")
          return <Box key={key} sx={{ borderTop: "1px solid #e5e7eb", my: 0.5 }} />;

        if (token.type === "h1")
          return (
            <Typography key={key} variant="h6" sx={{ fontWeight: 900, color: "#0f172a", mt: 1, lineHeight: 1.3 }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "h2")
          return (
            <Typography key={key} variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", mt: 0.5, lineHeight: 1.4 }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "h3")
          return (
            <Typography key={key} variant="subtitle2" sx={{ fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.78rem", mt: 0.5 }}>
              {renderInline(token.text)}
            </Typography>
          );

        if (token.type === "blockquote")
          return (
            <Box
              key={key}
              sx={{
                borderLeft: "3px solid #6366f1",
                pl: 2,
                py: 0.5,
                bgcolor: "rgba(99,102,241,0.04)",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <Typography variant="body2" sx={{ color: "#475569", fontStyle: "italic", lineHeight: 1.6 }}>
                {renderInline(token.text)}
              </Typography>
            </Box>
          );

        if (token.type === "bullet-list")
          return (
            <Box key={key} component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {token.items.map((item, ii) => (
                <Box key={ii} component="li" sx={{ color: "#475569" }}>
                  <Typography variant="body2" component="span" sx={{ lineHeight: 1.6, fontSize: "0.875rem" }}>
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
                      bgcolor: "#6366f1",
                      color: "white",
                      fontWeight: 800,
                      borderRadius: "50%",
                      minWidth: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      flexShrink: 0,
                      mt: 0.2,
                    }}
                  >
                    {ii + 1}
                  </Box>
                  <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6, fontSize: "0.875rem" }}>
                    {renderInline(item)}
                  </Typography>
                </Box>
              ))}
            </Box>
          );

        // paragraph
        return (
          <Typography key={key} variant="body2" sx={{ color: "#475569", lineHeight: 1.7, fontSize: "0.875rem" }}>
            {renderInline(token.text)}
          </Typography>
        );
      })}
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
  const [expanded, setExpanded] = useState(true);

  const dateStr = isMounted
    ? `${new Date(insight.createdAt).toLocaleDateString()} ${new Date(insight.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";

  const handleAskAI = () => {
    const question = `En te basant sur cette analyse "${insight.title}", peux-tu m'expliquer davantage et me donner des conseils pratiques ?`;
    window.dispatchEvent(new CustomEvent("ai-chat-open-with-message", { detail: { message: question } }));
  };

  return (
    <Card
      sx={{
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 4,
        bgcolor: "white",
        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.08)", borderColor: "#cbd5e1" },
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", flexGrow: 1 }}>
            {insight.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Typography
              variant="caption"
              sx={{
                bgcolor: "rgba(99,102,241,0.08)",
                color: "#4f46e5",
                fontWeight: 700,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: "0.72rem",
                whiteSpace: "nowrap",
              }}
            >
              {insightTypeLabels[insight.type] || insight.type.replace(/_/g, " ")}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onDelete(insight.id)}
              sx={{ color: "#9ca3af", p: 0.5, "&:hover": { color: "#ef4444", bgcolor: "rgba(239,68,68,0.05)" } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Content — collapsible when long */}
        <Collapse in={expanded} collapsedSize={120}>
          <MarkdownRenderer content={insight.content} />
        </Collapse>

        {/* Footer row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5, gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
              {dateStr}
            </Typography>
            {isEnabled && (
              <Button
                size="small"
                startIcon={<ChatIcon sx={{ fontSize: "0.85rem !important" }} />}
                onClick={handleAskAI}
                sx={{
                  color: "#4f46e5",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  textTransform: "none",
                  bgcolor: "rgba(99,102,241,0.06)",
                  borderRadius: 2,
                  px: 1,
                  py: 0.4,
                  "&:hover": { bgcolor: "rgba(99,102,241,0.12)" },
                }}
              >
                Demander à l&apos;IA
              </Button>
            )}
          </Box>
          <Button
            size="small"
            onClick={() => setExpanded((v) => !v)}
            endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            sx={{ color: "#6366f1", fontWeight: 700, fontSize: "0.75rem", textTransform: "none", minWidth: 0 }}
          >
            {expanded ? "Réduire" : "Tout afficher"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── InsightsPanel ────────────────────────────────────────────────────────────

export function InsightsPanel() {
  const [state, dispatch] = useReducer(insightsReducer, {
    insights: [],
    loading: true,
    error: null,
    enabled: false,
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
        const { enabled } = await apiService.get<{ enabled: boolean }>("/health/ai-insights/status");
        dispatch({ type: "FETCH_STATUS", enabled });
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

  const confirmEnable = async () => {
    try {
      await apiService.post("/health/ai-insights/enable");
      dispatch({ type: "SET_ENABLED", enabled: true });
      window.dispatchEvent(new CustomEvent("ai-insights-status-changed", { detail: { enabled: true } }));
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

  return (
    <Box
      sx={{
        width: "100%",
        mt: 4,
        bgcolor: "#f8fafc",
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon sx={{ color: "#f59e0b" }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Analyses par IA
          </Typography>
          {state.insights.length > 0 && (
            <Typography variant="caption" sx={{ bgcolor: "rgba(0,0,0,0.06)", color: "text.secondary", fontWeight: 700, px: 1.2, py: 0.3, borderRadius: 10, fontSize: "0.72rem" }}>
              {state.insights.length}
            </Typography>
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
          label={state.enabled ? "Activé" : "Désactivé"}
        />
      </Box>

      {/* Contexte limites */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, mb: 2 }}>
        <InfoOutlinedIcon sx={{ fontSize: "0.9rem", color: "#94a3b8", mt: "2px", flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: "#64748b", lineHeight: 1.5 }}>
          Les analyses sont générées automatiquement chaque jour à <strong>2h00 UTC</strong> à partir de vos journaux récents.
          {" "}Une analyse par type est conservée (résumé, tendances, anomalies, recommandations).
          {" "}Vous pouvez aussi en générer une manuellement ci-dessous.
        </Typography>
        <Tooltip title="L'IA analyse vos 30 derniers journaux et produit des insights personnalisés. Les anciennes analyses du même type sont remplacées automatiquement." arrow>
          <InfoOutlinedIcon sx={{ fontSize: "0.85rem", color: "#cbd5e1", mt: "2px", flexShrink: 0, cursor: "help" }} />
        </Tooltip>
      </Box>

      {!state.enabled && (
        <Alert severity="info" sx={{ mb: 2, bgcolor: "#eff6ff", border: "1px solid #bfdbfe", "& .MuiAlert-icon": { color: "#3b82f6" } }}>
          Les analyses par IA sont actuellement désactivées. Activez-les pour recevoir une analyse personnalisée de votre bien-être.
        </Alert>
      )}

      {state.enabled && (
        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            try {
              dispatch({ type: "FETCH_START" });
              await apiService.post("/health/ai-insights/generate");
              const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
              dispatch({ type: "FETCH_SUCCESS", insights });
            } catch (error: unknown) {
              dispatch({ type: "FETCH_ERROR", error: getErrorMessage(error) });
            }
          }}
          sx={{ mb: 2, borderColor: "#cbd5e1", color: "#475569", "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" } }}
        >
          Générer maintenant
        </Button>
      )}

      {state.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : state.error ? (
        <Alert severity="error">{state.error}</Alert>
      ) : state.insights.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: "#eff6ff", border: "1px solid #bfdbfe", "& .MuiAlert-icon": { color: "#3b82f6" } }}>
          Pas encore d&apos;analyses. Elles sont générées quotidiennement à 2h00 UTC.
        </Alert>
      ) : (
        <Stack spacing={2}>
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

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Activer les analyses par IA</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: "0.95rem", color: "text.primary" }}>
            Pour activer les analyses personnalisées, vous devez accepter les conditions de partage de contenu avec OpenAI.
          </DialogContentText>
          <Box
            sx={{
              bgcolor: "#f9fafb",
              p: 2,
              borderRadius: 1,
              border: "1px solid #e5e7eb",
              maxHeight: 200,
              overflowY: "auto",
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "text.secondary",
            }}
          >
            This Content Sharing Agreement is between OpenAI, L.L.C. (&quot;us&quot; or &quot;we&quot;) and you (&quot;Customer&quot;). This Content Sharing Agreement is incorporated into the terms located at https://openai.com/policies/business-terms unless the parties have negotiated a separate agreement for the Services, in which case such agreement will govern (the &quot;Business Terms&quot;). Capitalized terms not defined here are defined in the Business Terms or the Data Processing Agreement between the parties in connection with the Services (the &quot;DPA&quot;). This Content Sharing Agreement takes precedence in the event of any conflict.
            <br /><br />
            Notwithstanding anything set forth in the Business Terms, we may use Customer Content that is designated by your organization owner in your account (&quot;Designated Content&quot;) to develop and improve the Services, including for training our models and other research, development, evaluation, and testing purposes (&quot;Development Purposes&quot;). You expressly agree that use of Designated Content for the Development Purposes is not subject to the provisions of the DPA nor is it subject to the security measures, auditing, or other obligations applicable to Customer Content that is not Designated Content for the Development Purposes. OpenAI will process such Designated Content for Development Purposes as an independent Data Controller. You are responsible for all Input provided by you and your End Users.
            <br /><br />
            You also represent and warrant that you have the rights, licenses, and permissions necessary – including as applicable that you have provided any notice to End Users, and collected any relevant consent from End Users (&quot;Notice&quot;) – to provide the Input to the Services for the Development Purposes. You agree that you and your End Users will not provide any information as Input to the Services that you or your End Users do not want to be used for Development Purposes, such as sensitive, confidential, or proprietary information. You also agree that you will not use the Services to process (a) any data that includes or constitutes &quot;Protected Health Information,&quot; as defined under the HIPAA Privacy Rule (45 C.F.R. Section 160.103), or (b) any Personal Data of children under 13 or the applicable age of digital consent. You also agree that you will provide OpenAI a copy of your Notice upon OpenAI&apos;s request.
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenConfirm(false)} color="inherit">Annuler</Button>
          <Button onClick={confirmEnable} variant="contained">J&apos;accepte et j&apos;active</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
