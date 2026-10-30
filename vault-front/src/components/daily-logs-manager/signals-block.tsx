"use client";

import React from "react";
import { Box, Chip, Menu, MenuItem, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { apiService } from "@/services/api.service";
import type { SignalView } from "@/types";

interface SignalsBlockProps {
  logId: string;
  signals: SignalView[];
}

type Corrections = Record<string, number | null>;

const chipText = (signal: SignalView): string => {
  if (signal.category === "person") {
    return signal.toneLabel ? `${signal.label} : ${signal.toneLabel}` : signal.label;
  }
  if (signal.type === "score" && signal.levelLabel) {
    return `${signal.label} : ${signal.levelLabel.toLowerCase()}`;
  }
  return signal.label;
};

// Un ton seul n'est jamais une pastille : il qualifie la présence de la personne.
const isAddable = (signal: SignalView): boolean =>
  !signal.displayed && !(signal.category === "person" && signal.type === "score");

// Bloc discret sous la note : ce que l'analyse a retenu, corrigeable en un geste.
export const SignalsBlock: React.FC<SignalsBlockProps> = ({ logId, signals }) => {
  const [current, setCurrent] = React.useState(signals);
  const [previousProp, setPreviousProp] = React.useState(signals);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [levelPick, setLevelPick] = React.useState<SignalView | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (previousProp !== signals) {
    setPreviousProp(signals);
    setCurrent(signals);
  }

  const save = async (corrections: Corrections) => {
    setError(null);
    try {
      const response = await apiService.patch<{ signals: SignalView[] }, { corrections: Corrections }>(
        `/health/daily-logs/${logId}/signals`,
        { corrections },
      );
      setCurrent(response.signals);
    } catch {
      setError("La correction n'a pas pu être enregistrée.");
    }
  };

  const displayed = current.filter((signal) => signal.displayed);
  const addable = current.filter(isAddable);

  const closeMenus = () => {
    setAnchor(null);
    setLevelPick(null);
  };

  const choose = (signal: SignalView) => {
    if (signal.type === "score") {
      setLevelPick(signal);
      return;
    }
    closeMenus();
    void save({ [signal.key]: 1 });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        Ce que j&apos;ai retenu de ta journée
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
        {displayed.map((signal) => (
          <Chip
            key={signal.key}
            size="small"
            variant="outlined"
            label={chipText(signal)}
            onDelete={() => void save({ [signal.key]: signal.dismissValue })}
            deleteIcon={<span aria-label={`Retirer ${signal.label}`}>×</span>}
            sx={{ bgcolor: "action.hover", borderColor: "divider", color: "text.primary" }}
          />
        ))}
        {addable.length > 0 && (
          <Chip
            size="small"
            variant="outlined"
            icon={<AddIcon fontSize="small" />}
            label="Corriger"
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ color: "text.secondary", borderStyle: "dashed" }}
          />
        )}
      </Box>
      {error && (
        <Typography variant="caption" color="text.secondary" role="status" sx={{ display: "block", mt: 0.5 }}>
          {error}
        </Typography>
      )}
      <Menu anchorEl={anchor} open={Boolean(anchor) && !levelPick} onClose={closeMenus}>
        {addable.map((signal) => (
          <MenuItem key={signal.key} dense onClick={() => choose(signal)}>
            {signal.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={anchor} open={Boolean(anchor) && Boolean(levelPick)} onClose={closeMenus}>
        {levelPick?.levelLabels?.map((label, level) => (
          <MenuItem
            key={label}
            dense
            onClick={() => {
              const key = levelPick.key;
              closeMenus();
              void save({ [key]: level });
            }}
          >
            {levelPick.label} : {label.toLowerCase()}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
