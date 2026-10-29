"use client";

import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { getCorrelationAccent, getCorrelationColor } from "@/utils/math";

interface RankingCell {
  x: string;
  y: string;
  xId: string;
  yId: string;
  value: number;
  n?: number;
}

interface CorrelationRankingProps {
  matrixData: RankingCell[];
  fieldOrder: string[];
  activeFieldA: string;
  activeFieldB: string;
  onSelect: (cell: RankingCell) => void;
  limit?: number;
}

// Vue mobile de la matrice : les paires les plus liées, classées, avec une barre divergente centrée sur 0.
export const CorrelationRanking: React.FC<CorrelationRankingProps> = ({
  matrixData,
  fieldOrder,
  activeFieldA,
  activeFieldB,
  onSelect,
  limit = 8,
}) => {
  const pairs = React.useMemo(() => {
    const index = (id: string) => fieldOrder.indexOf(id);
    return matrixData
      // Moins de 5 jours en commun : le coefficient ne veut rien dire, on n'affiche pas la paire.
      .filter((c) => index(c.xId) < index(c.yId) && !Number.isNaN(c.value) && (c.n ?? 0) >= 5)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, limit);
  }, [matrixData, fieldOrder, limit]);

  if (pairs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        Pas encore assez de jours renseignés pour calculer des liens.
      </Typography>
    );
  }

  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
      {pairs.map((pair) => {
        const active = (pair.xId === activeFieldA && pair.yId === activeFieldB) || (pair.xId === activeFieldB && pair.yId === activeFieldA);
        const width = Math.min(Math.abs(pair.value), 1) * 50;
        return (
          <Box component="li" key={`${pair.xId}-${pair.yId}`}>
            <ButtonBase
              onClick={() => onSelect(pair)}
              aria-pressed={active}
              sx={{
                width: "100%",
                minHeight: 56,
                px: 1.5,
                borderRadius: 3,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 96px 44px",
                alignItems: "center",
                gap: 1.5,
                textAlign: "left",
                bgcolor: active ? "action.selected" : "transparent",
                "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: active ? 700 : 500 }}>
                  {pair.x} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>et</Box> {pair.y}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {pair.n} jours{(pair.n ?? 0) < 14 ? ", à confirmer" : ""}
                </Typography>
              </Box>
              <Box aria-hidden sx={{ position: "relative", height: 12 }}>
                <Box sx={{ position: "absolute", inset: "4px 0", borderRadius: 2, bgcolor: "action.hover" }} />
                <Box sx={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", bgcolor: "var(--chart-axis)" }} />
                <Box
                  sx={{
                    position: "absolute",
                    top: 1,
                    bottom: 1,
                    borderRadius: 1,
                    bgcolor: getCorrelationColor(pair.value),
                    ...(pair.value >= 0 ? { left: "50%" } : { right: "50%" }),
                    width: `${width}%`,
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: getCorrelationAccent(pair.value) }}>
                {pair.value > 0 ? "+" : ""}{pair.value.toFixed(2).replace(".", ",")}
              </Typography>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
};

export const CorrelationLegend: React.FC = () => (
  <Box sx={{ display: "grid", gap: 0.5 }}>
    <Box aria-hidden sx={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}>
      {["neg-3", "neg-2", "neg-1", "mid", "pos-1", "pos-2", "pos-3"].map((k) => (
        <Box key={k} sx={{ flex: 1, bgcolor: `var(--chart-${k})` }} />
      ))}
    </Box>
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="caption" color="text.secondary">-1 évolue en sens inverse</Typography>
      <Typography variant="caption" color="text.secondary">+1 évolue ensemble</Typography>
    </Box>
  </Box>
);
