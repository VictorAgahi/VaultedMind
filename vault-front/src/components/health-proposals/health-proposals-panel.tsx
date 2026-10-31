"use client";

import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { apiService } from "@/services/api.service";
import {
  AcceptHealthProposalDto,
  AppleWatchMetric,
  AppError,
  CustomField,
  HealthProposal,
  HealthProposalAcceptResult,
  HealthProposals,
} from "@/types";
import { fieldSuitsMetric, formatHealthValue, isClockTimeMetric } from "@/utils/health-metrics";
import { formatHourlyValue } from "@/utils/time-converter";

/** Événement envoyé quand un champ reçoit désormais une donnée Santé : le journal et les réglages se rechargent. */
export const HEALTH_LINKS_UPDATED_EVENT = "vaultedmind:fields-updated";

const exampleOf = (proposal: HealthProposal): string | null => {
  if (proposal.exampleValue === null) return null;
  return isClockTimeMetric(proposal.metric)
    ? formatHourlyValue(proposal.exampleValue)
    : formatHealthValue(proposal.metric, String(proposal.exampleValue));
};

const describeFilled = (result: HealthProposalAcceptResult): string => {
  const days = result.filledDays === 0
    ? "aucun jour passé à remplir"
    : `${result.filledDays} jour${result.filledDays > 1 ? "s" : ""} passé${result.filledDays > 1 ? "s" : ""} rempli${result.filledDays > 1 ? "s" : ""}`;
  return `« ${result.fieldName} » ${result.created ? "est créé et reçoit" : "reçoit"} désormais cette donnée : ${days}.`;
};

interface HealthProposalsPanelProps {
  /** Appelé après une réponse à une proposition, pour recharger ce qui en dépend. */
  onChanged?: () => void;
}

/** Propositions de l'assistant Santé : relier une donnée à un champ existant, créer un champ, ou ignorer. */
export const HealthProposalsPanel: React.FC<HealthProposalsPanelProps> = ({ onChanged }) => {
  const [data, setData] = useState<HealthProposals | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyMetric, setBusyMetric] = useState<AppleWatchMetric | null>(null);
  const [names, setNames] = useState<Partial<Record<AppleWatchMetric, string>>>({});
  const [choosing, setChoosing] = useState<AppleWatchMetric | null>(null);
  const [chosenFieldId, setChosenFieldId] = useState("");

  const fetchAll = async () => {
    try {
      const [proposals, allFields] = await Promise.all([
        apiService.get<HealthProposals>("/integrations/health/proposals"),
        apiService.get<CustomField[]>("/health/custom-fields"),
      ]);
      setData(proposals);
      setFields(allFields);
    } catch (err) {
      setError((err as AppError).message || "Impossible de charger les propositions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, []);

  const afterChange = async () => {
    await fetchAll();
    window.dispatchEvent(new CustomEvent(HEALTH_LINKS_UPDATED_EVENT));
    onChanged?.();
  };

  const accept = async (proposal: HealthProposal, body: AcceptHealthProposalDto) => {
    setBusyMetric(proposal.metric);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiService.post<HealthProposalAcceptResult, AcceptHealthProposalDto>(
        `/integrations/health/proposals/${proposal.metric}/accept`,
        body,
      );
      setSuccess(describeFilled(result));
      setChoosing(null);
      await afterChange();
    } catch (err) {
      setError((err as AppError).message || "Impossible d'enregistrer ce choix.");
    } finally {
      setBusyMetric(null);
    }
  };

  const ignore = async (proposal: HealthProposal) => {
    setBusyMetric(proposal.metric);
    setError(null);
    setSuccess(null);
    try {
      await apiService.post(`/integrations/health/proposals/${proposal.metric}/ignore`, {});
      await afterChange();
    } catch (err) {
      setError((err as AppError).message || "Impossible d'ignorer cette donnée.");
    } finally {
      setBusyMetric(null);
    }
  };

  const startChoosing = (proposal: HealthProposal) => {
    setChoosing(proposal.metric);
    setChosenFieldId("");
  };

  const renderChooser = (proposal: HealthProposal) => {
    // Seuls les champs libres et adaptés à la donnée sont proposés : une donnée ne va que dans un champ.
    const options = fields.filter(f => !f.appleWatchMetric && fieldSuitsMetric(f, proposal.metric));
    return (
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, mt: 1.5 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
          <Select
            value={chosenFieldId}
            onChange={(e) => setChosenFieldId(e.target.value)}
            displayEmpty
            inputProps={{ "aria-label": `Champ qui reçoit ${proposal.label}` }}
          >
            <MenuItem value="" disabled><em>{options.length > 0 ? "Choisir un champ" : "Aucun champ numérique libre"}</em></MenuItem>
            {options.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          disabled={!chosenFieldId || busyMetric !== null}
          onClick={() => accept(proposal, { fieldId: chosenFieldId })}
        >
          Relier
        </Button>
        <Button onClick={() => setChoosing(null)} disabled={busyMetric !== null}>Annuler</Button>
      </Box>
    );
  };

  const renderItem = (proposal: HealthProposal) => {
    const example = exampleOf(proposal);
    const busy = busyMetric === proposal.metric;
    const disabled = busyMetric !== null;
    return (
      <Box
        key={proposal.metric}
        sx={{ p: 2, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper" }}
      >
        {proposal.status === "PENDING_LINK" ? (
          <>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Relier « {proposal.label} » à « {proposal.fieldName} » ?
            </Typography>
            {example && <Typography variant="caption" color="text.secondary">Dernière valeur : {example}</Typography>}
            {proposal.reason && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{proposal.reason}</Typography>}
            {choosing === proposal.metric ? renderChooser(proposal) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                <Button variant="contained" disabled={disabled} onClick={() => accept(proposal, {})}>
                  {busy ? <CircularProgress size={18} color="inherit" /> : "Accepter"}
                </Button>
                <Button variant="outlined" disabled={disabled} onClick={() => startChoosing(proposal)}>Choisir un autre champ</Button>
                <Button disabled={disabled} onClick={() => ignore(proposal)}>Ignorer</Button>
              </Box>
            )}
          </>
        ) : (
          <>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Nouvelle donnée disponible : {proposal.label}{example ? ` (ex. ${example})` : ""}
            </Typography>
            {proposal.reason && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{proposal.reason}</Typography>}
            {choosing === proposal.metric ? renderChooser(proposal) : (
              <>
                <TextField
                  label="Nom du champ"
                  size="small"
                  fullWidth
                  value={names[proposal.metric] ?? proposal.suggestedName ?? proposal.label}
                  onChange={(e) => setNames(prev => ({ ...prev, [proposal.metric]: e.target.value }))}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  sx={{ mt: 1.5 }}
                />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                  <Button
                    variant="contained"
                    disabled={disabled || !(names[proposal.metric] ?? proposal.suggestedName ?? proposal.label).trim()}
                    onClick={() => accept(proposal, { create: { name: (names[proposal.metric] ?? proposal.suggestedName ?? proposal.label).trim() } })}
                  >
                    {busy ? <CircularProgress size={18} color="inherit" /> : "Créer le champ"}
                  </Button>
                  <Button variant="outlined" disabled={disabled} onClick={() => startChoosing(proposal)}>Choisir un champ existant</Button>
                  <Button disabled={disabled} onClick={() => ignore(proposal)}>Ignorer</Button>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  const proposals = data?.proposals ?? [];
  const main = proposals.filter(p => p.status === "PENDING_LINK" || p.relevance === "high");
  const others = proposals.filter(p => p.status === "PENDING_NEW" && p.relevance === "low");

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      {proposals.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Aucune proposition en attente. Les nouvelles données Santé reçues apparaîtront ici.
        </Typography>
      )}
      {main.map(renderItem)}
      {others.length > 0 && (
        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 3, "&::before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Autres données disponibles ({others.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Ces données servent rarement au suivi de l&apos;humeur. Elles restent conservées : vous pouvez les utiliser plus tard.
            </Typography>
            <Stack spacing={1.5}>{others.map(renderItem)}</Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
};

interface HealthProposalsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Les mêmes propositions, ouvertes depuis la confirmation d'une synchronisation. */
export const HealthProposalsDialog: React.FC<HealthProposalsDialogProps> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Propositions pour vos données Santé</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Rien n&apos;est ajouté à votre journal sans votre accord. Une donnée reliée remplit aussi les jours passés encore vides, jamais une valeur que vous avez saisie.
      </Typography>
      {open && <HealthProposalsPanel />}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Fermer</Button>
    </DialogActions>
  </Dialog>
);
