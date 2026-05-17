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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiService } from "@/services/api.service";
import { AIInsightResponseDto } from "@/types";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PsychologyIcon from "@mui/icons-material/Psychology";
import LightbulbIcon from "@mui/icons-material/Lightbulb";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
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
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, insights: action.insights, loading: false, error: null };
    case "FETCH_STATUS":
      return { ...state, enabled: action.enabled, loading: false };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "SET_ENABLED":
      return { ...state, enabled: action.enabled };
    case "DELETE_INSIGHT":
      return { ...state, insights: state.insights.filter((i) => i.id !== action.id) };
    default:
      return state;
  }
}

const insightTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Résumé quotidien",
  WEEKLY_TREND: "Tendances hebdomadaires",
  ANOMALY: "Anomalie détectée",
  RECOMMENDATION: "Recommandation",
};

function InsightContent({ text }: { text: string }) {
  if (!text) return null;

  // Split by newlines
  const lines = text.split("\n").flatMap((l) => {
    const trimmed = l.trim();
    return trimmed ? [trimmed] : [];
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
      {lines.map((line, idx) => {
        // Parse bold text helper
        const parseBoldText = (str: string) => {
          const parts = str.split(/\*\*([^*]+)\*\*/g);
          return parts.map((part, i) => {
            if (i % 2 === 1) {
              return (
                <Box key={i} component="span" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {part}
                </Box>
              );
            }
            return part;
          });
        };

        // Section: Analysis
        if (line.includes("🔍") || line.toLowerCase().includes("analyse comportementale")) {
          const cleanText = line.replace(/🔍\s*(\*\*([^*]+)\*\*|[^:]+):?/, "").trim();
          return (
            <Box 
              key={idx} 
              sx={{ 
                p: 2, 
                borderRadius: 3, 
                bgcolor: "rgba(99, 102, 241, 0.03)", 
                borderLeft: "4px solid #6366f1",
                mt: 0.5
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 900, 
                  color: "#4f46e5", 
                  display: "flex", 
                  alignItems: "center", 
                  mb: 1,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                <PsychologyIcon sx={{ fontSize: 20, color: "#4f46e5", mr: 1 }} />
                Analyse comportementale & Observations
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.7, fontSize: "0.9rem" }}>
                {parseBoldText(cleanText)}
              </Typography>
            </Box>
          );
        }

        // Section: Recommendations header
        if (line.includes("💡") || line.toLowerCase().includes("recommandations concrètes")) {
          return (
            <Typography 
              key={idx}
              variant="subtitle2" 
              sx={{ 
                fontWeight: 900, 
                color: "#d97706", 
                display: "flex", 
                alignItems: "center", 
                mt: 1.5,
                mb: 0.5,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              <LightbulbIcon sx={{ fontSize: 18, color: "#d97706", mr: 1 }} />
              Recommandations concrètes
            </Typography>
          );
        }

        // Recommendation Items (e.g. "1. **Routine...**")
        const matchListItem = line.match(/^(\d+)\.\s*(.*)/);
        if (matchListItem) {
          const number = matchListItem[1];
          const itemText = matchListItem[2];
          return (
            <Box 
              key={idx} 
              sx={{ 
                display: "flex", 
                gap: 1.5, 
                p: 1.5, 
                borderRadius: 2.5, 
                bgcolor: "rgba(245, 158, 11, 0.02)", 
                borderLeft: "3px solid #f59e0b",
                alignItems: "flex-start"
              }}
            >
              <Box 
                sx={{ 
                  bgcolor: "#f59e0b", 
                  color: "white", 
                  fontWeight: 800, 
                  borderRadius: "50%", 
                  width: 20, 
                  height: 20, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "0.7rem",
                  flexShrink: 0,
                  mt: 0.2
                }}
              >
                {number}
              </Box>
              <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6, fontSize: "0.875rem" }}>
                {parseBoldText(itemText)}
              </Typography>
            </Box>
          );
        }

        // Standard text
        return (
          <Typography 
            key={idx} 
            variant="body2" 
            sx={{ 
              color: "#475569", 
              lineHeight: 1.6, 
              fontSize: "0.875rem",
              fontStyle: line.startsWith("Souviens-toi") || line.startsWith("Ces petits") || line.startsWith("Chaque petite") || line.startsWith("chaque petite") ? "italic" : "normal",
              bgcolor: line.startsWith("Souviens-toi") || line.startsWith("Ces petits") || line.startsWith("Chaque petite") || line.startsWith("chaque petite") ? "rgba(0,0,0,0.01)" : "transparent",
              p: line.startsWith("Souviens-toi") || line.startsWith("Ces petits") || line.startsWith("Chaque petite") || line.startsWith("chaque petite") ? 1.5 : 0,
              borderRadius: 2,
              borderLeft: line.startsWith("Souviens-toi") || line.startsWith("Ces petits") || line.startsWith("Chaque petite") || line.startsWith("chaque petite") ? "2px solid rgba(0,0,0,0.1)" : "none",
              mt: 0.5
            }}
          >
            {parseBoldText(line)}
          </Typography>
        );
      })}
    </Box>
  );
}

function InsightCard({ insight, isMounted, onDelete }: { insight: AIInsightResponseDto, isMounted: boolean, onDelete: (id: string) => void }) {
  const dateStr = isMounted ? `${new Date(insight.createdAt).toLocaleDateString()} ${new Date(
    insight.createdAt
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}` : "";

  return (
    <Card
      sx={{
        border: "1px solid #e5e7eb",
        boxShadow: "none",
        borderRadius: 4,
        "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2.5,
            gap: 2
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", flexGrow: 1 }}>
            {insight.title}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            <Typography
              variant="caption"
              sx={{
                bgcolor: "rgba(99, 102, 241, 0.08)",
                color: "#4f46e5",
                fontWeight: 700,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                fontSize: "0.75rem",
                whiteSpace: "nowrap"
              }}
            >
              {insightTypeLabels[insight.type] || insight.type.replace(/_/g, " ")}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onDelete(insight.id)}
              sx={{
                color: "#9ca3af",
                p: 0.5,
                "&:hover": { color: "#ef4444", bgcolor: "rgba(239, 68, 68, 0.05)" },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <InsightContent text={insight.content} />

        <Typography
          variant="caption"
          sx={{ color: "#9ca3af", minHeight: "1em", display: "block" }}
        >
          {dateStr}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function InsightsPanel() {
  const [state, dispatch] = useReducer(insightsReducer, {
    insights: [],
    loading: true,
    error: null,
    enabled: false,
  });
  const [openConfirm, setOpenConfirm] = useState(false);

  const isMounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );

  useEffect(() => {
    const init = async () => {
      try {
        dispatch({ type: "FETCH_START" });
        const { enabled } = await apiService.get<{ enabled: boolean }>(
          "/health/ai-insights/status"
        );
        dispatch({ type: "FETCH_STATUS", enabled });

        if (enabled) {
          const insights = await apiService.get<AIInsightResponseDto[]>(
            "/health/ai-insights"
          );
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
      const insights = await apiService.get<AIInsightResponseDto[]>(
        "/health/ai-insights"
      );
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
    <Box sx={{ width: "100%", mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon sx={{ color: "#f59e0b" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Analyses par IA
          </Typography>
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

      {!state.enabled ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Les analyses par IA sont actuellement désactivées. Activez-les pour recevoir une analyse personnalisée de votre bien-être.
        </Alert>
      ) : null}

      {state.enabled && (
        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            try {
              dispatch({ type: "FETCH_START" });
              await apiService.post("/health/ai-insights/generate");
              const insights = await apiService.get<AIInsightResponseDto[]>(
                "/health/ai-insights"
              );
              dispatch({ type: "FETCH_SUCCESS", insights });
            } catch (error: unknown) {
              dispatch({ type: "FETCH_ERROR", error: getErrorMessage(error) });
            }
          }}
          sx={{ mb: 2 }}
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
        <Alert severity="info">
          Pas encore d&apos;analyses. Elles sont générées quotidiennement à 2h00 UTC.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {state.insights.slice(0, 3).map((insight) => {
            return (
              <InsightCard key={insight.id} insight={insight} isMounted={isMounted} onDelete={deleteInsight} />
            );
          })}
        </Stack>
      )}

      <Dialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Activer les analyses par IA
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: "0.95rem", color: "text.primary" }}>
            Pour activer les analyses personnalisées, vous devez accepter les conditions de partage de contenu avec OpenAI.
          </DialogContentText>
          <Box sx={{
            bgcolor: "#f9fafb",
            p: 2,
            borderRadius: 1,
            border: "1px solid #e5e7eb",
            maxHeight: 200,
            overflowY: "auto",
            fontSize: "0.85rem",
            fontStyle: "italic",
            color: "text.secondary"
          }}>
            This Content Sharing Agreement is between OpenAI, L.L.C. (“us” or “we”) and you (“Customer”). This Content Sharing Agreement is incorporated into the terms located at https://openai.com/policies/business-terms unless the parties have negotiated a separate agreement for the Services, in which case such agreement will govern (the “Business Terms”). Capitalized terms not defined here are defined in the Business Terms or the Data Processing Agreement between the parties in connection with the Services (the “DPA”). This Content Sharing Agreement takes precedence in the event of any conflict.
            <br /><br />
            Notwithstanding anything set forth in the Business Terms, we may use Customer Content that is designated by your organization owner in your account (“Designated Content”) to develop and improve the Services, including for training our models and other research, development, evaluation, and testing purposes (“Development Purposes”). You expressly agree that use of Designated Content for the Development Purposes is not subject to the provisions of the DPA nor is it subject to the security measures, auditing, or other obligations applicable to Customer Content that is not Designated Content for the Development Purposes. OpenAI will process such Designated Content for Development Purposes as an independent Data Controller. You are responsible for all Input provided by you and your End Users.
            <br /><br />
            You also represent and warrant that you have the rights, licenses, and permissions necessary – including as applicable that you have provided any notice to End Users, and collected any relevant consent from End Users (“Notice”) – to provide the Input to the Services for the Development Purposes. You agree that you and your End Users will not provide any information as Input to the Services that you or your End Users do not want to be used for Development Purposes, such as sensitive, confidential, or proprietary information. You also agree that you will not use the Services to process (a) any data that includes or constitutes “Protected Health Information,” as defined under the HIPAA Privacy Rule (45 C.F.R. Section 160.103), or (b) any Personal Data of children under 13 or the applicable age of digital consent. You also agree that you will provide OpenAI a copy of your Notice upon OpenAI&apos;s request.
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenConfirm(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={confirmEnable} variant="contained">
            J&apos;accepte et j&apos;active
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}