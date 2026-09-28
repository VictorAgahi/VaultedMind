"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Button,
  Collapse,
  Stack,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ChatIcon from "@mui/icons-material/Chat";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { apiService } from "@/services/api.service";
import { AIInsightResponseDto } from "@/types";
import { MarkdownRenderer } from "@/components/ai-insights/insights-panel";

const insightTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Résumé quotidien",
  WEEKLY_TREND: "Tendances hebdo",
  MONTHLY_TREND: "Bilan mensuel",
  ANOMALY: "Anomalie",
  RECOMMENDATION: "Conseil",
};

const insightTypeColors: Record<string, "primary" | "secondary" | "success" | "warning" | "info" | "default"> = {
  DAILY_SUMMARY: "primary",
  WEEKLY_TREND: "secondary",
  MONTHLY_TREND: "info",
  ANOMALY: "warning",
  RECOMMENDATION: "success",
};

export function LatestAIReviewCard() {
  const [insight, setInsight] = useState<AIInsightResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestInsight = async () => {
      try {
        const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
        if (isMounted) {
          if (insights && insights.length > 0) {
            setInsight(insights[0]);
          } else {
            setInsight(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest AI insight:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLatestInsight();

    const handleRefresh = () => {
      fetchLatestInsight();
    };

    window.addEventListener("ai-insights-updated", handleRefresh);
    window.addEventListener("vaultedmind:logs-imported", handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener("ai-insights-updated", handleRefresh);
      window.removeEventListener("vaultedmind:logs-imported", handleRefresh);
    };
  }, []);

  const handleAskAssistant = () => {
    if (!insight) return;
    window.dispatchEvent(
      new CustomEvent("ai-chat-open-with-message", {
        detail: {
          message: `Peux-tu m'expliquer plus en détail cette analyse : "${insight.title}" ?`,
        },
      })
    );
    const btn = document.getElementById("fab-ai-chat");
    if (btn) btn.click();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.08)",
          bgcolor: "background.paper",
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 140,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} color="primary" />
          <Typography variant="body2" color="text.secondary">
            Chargement de la dernière revue IA...
          </Typography>
        </Stack>
      </Card>
    );
  }

  if (!insight) {
    return (
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.06)",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            sx={{
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: "rgba(99, 102, 241, 0.1)",
                  color: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AutoAwesomeIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b" }}>
                  Aucune revue IA pour le moment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Renseignez vos journaux quotidiens pour permettre au moteur multi-agents de générer votre première analyse.
                </Typography>
              </Box>
            </Box>

            <Button
              component={Link}
              href="/ai"
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 3,
                borderColor: "primary.main",
                whiteSpace: "nowrap",
                alignSelf: { xs: "stretch", sm: "center" },
              }}
            >
              Découvrir l&apos;espace IA
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const typeLabel = insightTypeLabels[insight.type] || insight.type;
  const chipColor = insightTypeColors[insight.type] || "default";

  return (
    <Card
      sx={{
        mb: 4,
        borderRadius: 4,
        boxShadow: "0 10px 30px rgba(79, 70, 229, 0.08)",
        background: "linear-gradient(135deg, #ffffff 0%, #fbfbfe 100%)",
        border: "1px solid rgba(99, 102, 241, 0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: 4,
          background: "linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #c084fc 100%)",
        }}
      />

      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        {/* Header Section */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                bgcolor: "rgba(79, 70, 229, 0.1)",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PsychologyIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.75rem" }}>
              Dernière Revue IA
            </Typography>
            <Chip
              label={typeLabel}
              color={chipColor}
              size="small"
              sx={{ fontWeight: 700, height: 24, fontSize: "0.75rem" }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", ml: { sm: 1 } }}>
              {formatDate(insight.createdAt)}
            </Typography>
          </Box>

          <Button
            component={Link}
            href="/ai"
            size="small"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: "#4f46e5",
              p: 0,
              minWidth: "auto",
              '&:hover': { bgcolor: "transparent", textDecoration: "underline" },
            }}
          >
            Toutes les analyses
          </Button>
        </Box>

        {/* Insight Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: "#0f172a",
            mb: 1.5,
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
            lineHeight: 1.3,
          }}
        >
          {insight.title}
        </Typography>

        {/* Insight Preview / Body */}
        <Box sx={{ position: "relative" }}>
          <Collapse in={expanded} collapsedSize={110}>
            <Box
              sx={{
                color: "#334155",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                "& p": { my: 1 },
              }}
            >
              <MarkdownRenderer content={insight.content} />
            </Box>
          </Collapse>

          {/* Fade mask when collapsed */}
          {!expanded && (
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 48,
                background: "linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>

        {/* Actions Bar */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1.5,
            mt: 2,
            pt: 2,
            borderTop: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          <Button
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: "text.secondary",
              alignSelf: { xs: "flex-start", sm: "center" },
            }}
          >
            {expanded ? "Réduire l'analyse" : "Lire l'analyse complète"}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<ChatIcon fontSize="small" />}
            onClick={handleAskAssistant}
            sx={{
              bgcolor: "#4f46e5",
              color: "white",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2,
              py: 0.8,
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              '&:hover': {
                bgcolor: "#4338ca",
              },
            }}
          >
            En discuter avec l&apos;assistant
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
