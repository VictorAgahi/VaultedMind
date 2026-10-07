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
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import ChatIcon from "@mui/icons-material/Chat";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PsychologyIcon from "@mui/icons-material/Psychology";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { apiService } from "@/services/api.service";
import { AIInsightResponseDto } from "@/types";
import { MarkdownRenderer } from "@/components/ai-insights/insights-panel";
import { useCurrentTime } from "@/utils/use-current-time";

const insightTypeLabels: Record<string, string> = {
  DAILY_SUMMARY: "Résumé quotidien",
  WEEKLY_TREND: "Tendances hebdo",
  MONTHLY_TREND: "Bilan mensuel",
  ANOMALY: "Anomalie",
  RECOMMENDATION: "Conseil",
};

export function LatestAIReviewCard() {
  const [insight, setInsight] = useState<AIInsightResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const currentTime = useCurrentTime();

  const getCooldownInfo = () => {
    if (!insight || currentTime === 0) return { active: false, text: "" };
    const diffMs = currentTime - new Date(insight.createdAt).getTime();
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

  const handleLaunchReview = async () => {
    try {
      setIsGenerating(true);
      await apiService.post("/health/ai-insights/generate");
      window.dispatchEvent(new CustomEvent("ai-insights-updated"));
      const insights = await apiService.get<AIInsightResponseDto[]>("/health/ai-insights");
      if (insights && insights.length > 0) {
        setInsight(insights[0]);
      }
    } catch (err: unknown) {
      console.error("Failed to generate review:", err);
    } finally {
      setIsGenerating(false);
    }
  };

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

  // Preview text for the card before opening the modal
  const getExcerpt = (content: string) => {
    const plain = content
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/>\s+/g, "")
      .replace(/[-*+]\s+/g, "")
      .trim();
    if (plain.length <= 180) return plain;
    return `${plain.slice(0, 180)}...`;
  };

  if (loading) {
    return (
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          bgcolor: "#ede5d9",
          border: "1.5px solid #d81832",
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 140,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} sx={{ color: "#d81832" }} />
          <Typography variant="body2" sx={{ color: "text.primary" }}>
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
          bgcolor: "#ede5d9",
          border: "1.5px solid #d81832",
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
                  bgcolor: "rgba(216, 24, 50, 0.1)",
                  color: "#d81832",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AutoAwesomeIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#142949" }}>
                  Aucune revue IA pour le moment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Renseignez vos journaux quotidiens pour permettre au moteur multi-agents de générer votre première analyse.
                </Typography>
              </Box>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignSelf: { xs: "stretch", sm: "center" } }}>
              <Button
                variant="contained"
                size="small"
                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                disabled={isGenerating}
                onClick={handleLaunchReview}
                sx={{
                  bgcolor: "#d81832",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 0.8,
                  boxShadow: "0 4px 14px rgba(216, 24, 50, 0.25)",
                  '&:hover': { bgcolor: "#c2152a" },
                }}
              >
                {isGenerating ? "Génération en cours..." : "Lancer ma review"}
              </Button>
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
                  borderColor: "#d81832",
                  color: "#d81832",
                  whiteSpace: "nowrap",
                  '&:hover': {
                    borderColor: "#c2152a",
                    bgcolor: "rgba(216, 24, 50, 0.05)",
                  },
                }}
              >
                Espace IA
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const typeLabel = insightTypeLabels[insight.type] || insight.type;

  return (
    <>
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          bgcolor: "#ede5d9",
          border: "1.5px solid #d81832",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Accent line matching VaultedMind red */}
        <Box
          sx={{
            height: 4,
            background: "linear-gradient(90deg, #d81832 0%, #e63a4f 100%)",
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
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: "rgba(216, 24, 50, 0.1)",
                  color: "#d81832",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PsychologyIcon fontSize="small" />
              </Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: "#d81832",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.75rem",
                }}
              >
                Dernière Revue IA
              </Typography>
              <Chip
                label={typeLabel}
                size="small"
                sx={{
                  fontWeight: 700,
                  height: 24,
                  fontSize: "0.75rem",
                  bgcolor: "#d81832",
                  color: "#ffffff",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
                color: "#d81832",
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
              color: "#142949",
              mb: 1,
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
              lineHeight: 1.3,
            }}
          >
            {insight.title}
          </Typography>

          {/* Clean excerpt preview */}
          <Typography
            variant="body2"
            sx={{
              color: "#4b5563",
              lineHeight: 1.6,
              mb: 2.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {getExcerpt(insight.content)}
          </Typography>

          {/* Actions Bar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1.5,
              pt: 2,
              borderTop: "1px solid rgba(216, 24, 50, 0.15)",
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MenuBookIcon fontSize="small" />}
                onClick={() => setModalOpen(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#d81832",
                  borderColor: "#d81832",
                  borderRadius: 2.5,
                  px: 2,
                  py: 0.8,
                  '&:hover': {
                    borderColor: "#c2152a",
                    bgcolor: "rgba(216, 24, 50, 0.05)",
                  },
                }}
              >
                Lire l&apos;analyse complète
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />}
                disabled={isGenerating || cooldown.active}
                onClick={handleLaunchReview}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  color: cooldown.active ? "#64748b" : "#142949",
                  borderColor: cooldown.active ? "#cbd5e1" : "#142949",
                  borderRadius: 2.5,
                  px: 2,
                  py: 0.8,
                  bgcolor: cooldown.active ? "rgba(0,0,0,0.03)" : "transparent",
                  '&:hover': {
                    borderColor: "#0f1f38",
                    bgcolor: "rgba(20, 41, 73, 0.05)",
                  },
                }}
              >
                {isGenerating
                  ? "Génération en cours..."
                  : cooldown.active
                  ? `Review dans ${cooldown.text}`
                  : "Lancer ma review"}
              </Button>
            </Stack>

            <Button
              variant="contained"
              size="small"
              startIcon={<ChatIcon fontSize="small" />}
              onClick={handleAskAssistant}
              sx={{
                bgcolor: "#d81832",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2.5,
                px: 2.5,
                py: 0.8,
                boxShadow: "0 4px 14px rgba(216, 24, 50, 0.25)",
                '&:hover': {
                  bgcolor: "#c2152a",
                },
              }}
            >
              En discuter avec l&apos;assistant
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Modal pour lire l'analyse complète avec icône de fermeture */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#ede5d9",
              border: "1.5px solid #d81832",
              borderRadius: 4,
              p: { xs: 1, sm: 2 },
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            pb: 1.5,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <Chip
                label={typeLabel}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: "#d81832",
                  color: "#ffffff",
                  height: 22,
                  fontSize: "0.75rem",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {formatDate(insight.createdAt)}
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#142949", lineHeight: 1.3 }}>
              {insight.title}
            </Typography>
          </Box>

          <IconButton
            onClick={() => setModalOpen(false)}
            aria-label="Fermer la modal"
            size="small"
            sx={{
              color: "#d81832",
              bgcolor: "rgba(216, 24, 50, 0.08)",
              '&:hover': { bgcolor: "rgba(216, 24, 50, 0.16)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "rgba(216, 24, 50, 0.2)", py: 2.5 }}>
          <Box
            sx={{
              color: "#142949",
              fontSize: "0.95rem",
              lineHeight: 1.7,
              "& p": { my: 1.2 },
              "& h2": { color: "#142949", mt: 2.5, mb: 1, fontWeight: 800 },
              "& h3": { color: "#d81832", mt: 2, mb: 0.8, fontWeight: 700 },
              "& li": { my: 0.5 },
            }}
          >
            <MarkdownRenderer content={insight.content} />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between", gap: 1 }}>
          <Button
            onClick={() => setModalOpen(false)}
            sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}
          >
            Fermer
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<ChatIcon fontSize="small" />}
            onClick={() => {
              setModalOpen(false);
              handleAskAssistant();
            }}
            sx={{
              bgcolor: "#d81832",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2,
              '&:hover': { bgcolor: "#c2152a" },
            }}
          >
            En discuter avec l&apos;assistant
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
