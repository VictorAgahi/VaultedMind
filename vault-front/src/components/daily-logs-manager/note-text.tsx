"use client";

import React from "react";
import { Box, Button, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface NoteTextProps {
  notes?: string;
  notesClean?: string | null;
  variant: "card" | "cell";
}

// Affiche la version reformulée par défaut quand elle existe ; l'original reste accessible et seul modifiable.
export const NoteText: React.FC<NoteTextProps> = ({ notes, notesClean, variant }) => {
  const [showOriginal, setShowOriginal] = React.useState(false);
  const hasClean = Boolean(notesClean);
  const text = (hasClean && !showOriginal ? notesClean : notes) || "-";

  const textSx: SxProps<Theme> =
    variant === "card"
      ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }
      : { maxWidth: { xs: 100, sm: 150, md: 200 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

  return (
    <Box>
      <Typography variant="body2" color={variant === "card" ? "text.secondary" : undefined} sx={textSx}>
        {text}
      </Typography>
      {hasClean && (
        <Button size="small" onClick={() => setShowOriginal((current) => !current)} sx={{ px: 0, minWidth: 0, textTransform: "none", fontSize: "0.75rem" }}>
          {showOriginal ? "Voir la version reformulée" : "Voir le texte original"}
        </Button>
      )}
    </Box>
  );
};
