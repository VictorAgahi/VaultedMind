"use client";

import React from "react";
import { Box, Paper, Typography, ButtonBase } from "@mui/material";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";

// Numéros d'aide en France, gratuits. Le 3114 est le numéro national de prévention du suicide (24 h/24, 7 j/7).
const RESOURCES = [
  { number: "3114", tel: "3114", label: "Prévention du suicide", hint: "24 h/24, gratuit" },
  { number: "15", tel: "15", label: "Urgence médicale (SAMU)", hint: "ou le 112 depuis l'Europe" },
  { number: "09 72 39 40 50", tel: "0972394050", label: "SOS Amitié", hint: "Écoute 24 h/24" },
  { number: "0 800 235 236", tel: "0800235236", label: "Fil Santé Jeunes", hint: "12-25 ans, gratuit" },
];

export const CrisisResources: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Paper component="section" aria-labelledby="crisis-title" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: "grid", gap: 1.5 }}>
    <Box>
      <Typography id="crisis-title" variant="subtitle1">Besoin d&apos;aide maintenant ?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
        VaultedMind ne remplace pas un professionnel. Si vous traversez un moment difficile ou pensez au suicide, appelez : quelqu&apos;un vous répondra.
      </Typography>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: compact ? "1fr" : "1fr 1fr" }, gap: 1 }}>
      {RESOURCES.map((r) => (
        <ButtonBase
          key={r.tel}
          component="a"
          href={`tel:${r.tel}`}
          aria-label={`Appeler le ${r.number}, ${r.label}`}
          sx={{ justifyContent: "flex-start", gap: 1.5, p: 1.5, minHeight: 56, borderRadius: 3, bgcolor: "action.hover", textAlign: "left", "&:hover": { bgcolor: "action.selected" } }}
        >
          <Box sx={{ width: 36, height: 36, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText" }}>
            <PhoneOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.number}</Typography>
            <Typography variant="caption" color="text.secondary">{r.label}, {r.hint.toLowerCase()}</Typography>
          </Box>
        </ButtonBase>
      ))}
    </Box>
  </Paper>
);
