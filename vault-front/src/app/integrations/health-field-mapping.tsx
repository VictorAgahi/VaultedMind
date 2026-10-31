"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { apiService } from "@/services/api.service";
import { AppleWatchMetric, CustomField, HealthFieldUnit, HealthProposals, UpdateCustomFieldDto } from "@/types";
import {
  FIELD_UNIT_LABELS,
  fieldSuitsMetric,
  fieldUnitHint,
  HEALTH_METRICS,
  healthMetricInfo,
  isDurationMetric,
} from "@/utils/health-metrics";

const NO_FIELD = "";

const filledDaysMessage = (days: number) =>
  `${days} ${days > 1 ? "jours remplis" : "jour rempli"} depuis vos données Santé`;

interface HealthFieldMappingProps {
  /** Appelé après un changement qui modifie les propositions (donnée de nouveau suivie, champ supprimé). */
  onChanged?: () => void;
}

/** Pour chaque donnée Santé, le champ qui la reçoit et son unité ; les données ignorées ; les anciens champs à nettoyer. */
export const HealthFieldMapping: React.FC<HealthFieldMappingProps> = ({ onChanged }) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [proposals, setProposals] = useState<HealthProposals | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMetric, setSavingMetric] = useState<AppleWatchMetric | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    try {
      const [data, view] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields"),
        apiService.get<HealthProposals>("/integrations/health/proposals"),
      ]);
      setFields(data);
      setProposals(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos champs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, []);

  const run = async (metric: AppleWatchMetric | null, action: () => Promise<unknown>, failure: string) => {
    setSavingMetric(metric);
    setError(null);
    setNotice(null);
    try {
      await action();
      await fetchAll();
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setSavingMetric(null);
    }
  };

  const handleChange = (metric: AppleWatchMetric, fieldId: string) => {
    const current = fields.find(f => f.appleWatchMetric === metric);
    if ((current?.id ?? NO_FIELD) === fieldId) return;
    void run(metric, async () => {
      if (fieldId === NO_FIELD) {
        if (current) {
          await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${current.id}`, { appleWatchMetric: null });
        }
      } else {
        const updated = await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${fieldId}`, { appleWatchMetric: metric });
        if (updated.healthFilledDays) setNotice(filledDaysMessage(updated.healthFilledDays));
      }
    }, "Impossible d'enregistrer ce choix.");
  };

  const handleUnitChange = (metric: AppleWatchMetric, field: CustomField, unit: HealthFieldUnit) => {
    if (field.appleWatchUnit === unit) return;
    void run(metric, async () => {
      const updated = await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${field.id}`, { appleWatchUnit: unit });
      if (updated.healthFilledDays) setNotice(filledDaysMessage(updated.healthFilledDays));
    }, "Impossible de changer l'unité.");
  };

  const handleUnignore = (metric: AppleWatchMetric) => {
    void run(metric, () => apiService.post(`/integrations/health/proposals/${metric}/unignore`, {}), "Impossible de suivre de nouveau cette donnée.");
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    await run(null, () => apiService.delete(`/health/custom-fields/${toDelete.id}`), "Impossible de supprimer ce champ.");
    setDeleting(false);
    setToDelete(null);
  };

  const ignored = proposals?.ignored ?? [];
  const legacyFields = proposals?.legacyFields ?? [];

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Où vont mes données Santé
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choisissez le champ qui reçoit chaque donnée. Les données sans champ restent conservées sans rien ajouter à votre journal : VaultedMind vous propose un champ existant ou un nouveau champ, que vous acceptez ou non. Un champ ne reçoit qu&apos;une seule donnée, et une donnée ne va que dans un seul champ.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack spacing={2}>
            {HEALTH_METRICS.map(info => {
              const current = fields.find(f => f.appleWatchMetric === info.metric);
              const options = fields.filter(f => f.id === current?.id || fieldSuitsMetric(f, info.metric));
              const labelId = `health-mapping-${info.metric}`;
              const isIgnored = ignored.some(entry => entry.metric === info.metric);
              return (
                <Box
                  key={info.metric}
                  sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, gap: { xs: 1, sm: 2 } }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography id={labelId} variant="body1" sx={{ fontWeight: 600 }}>{info.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {current ? `En ${fieldUnitHint(current, info.metric)}` : isIgnored ? "Ignorée" : `En ${info.unitHint}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
                    <FormControl size="small" sx={{ flex: 1, width: { sm: current && isDurationMetric(info.metric) ? 200 : 320 } }}>
                      <Select
                        value={current?.id ?? NO_FIELD}
                        onChange={(e) => handleChange(info.metric, e.target.value)}
                        disabled={savingMetric !== null}
                        displayEmpty
                        inputProps={{ "aria-labelledby": labelId }}
                      >
                        <MenuItem value={NO_FIELD}><em>Aucun champ</em></MenuItem>
                        {options.map(f => (
                          <MenuItem key={f.id} value={f.id}>
                            {f.name}
                            {f.appleWatchMetric && f.appleWatchMetric !== info.metric ? ` (reçoit déjà : ${healthMetricInfo(f.appleWatchMetric)?.label ?? "une autre donnée"})` : ""}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {current && isDurationMetric(info.metric) && (
                      <FormControl size="small" sx={{ width: 112 }}>
                        <Select
                          value={current.appleWatchUnit ?? (info.metric === AppleWatchMetric.EXERCISE_MINUTES ? "minutes" : "hours")}
                          onChange={(e) => handleUnitChange(info.metric, current, e.target.value as HealthFieldUnit)}
                          disabled={savingMetric !== null}
                          inputProps={{ "aria-label": `Unité de ${current.name}` }}
                        >
                          {(Object.keys(FIELD_UNIT_LABELS) as HealthFieldUnit[]).map(unit => (
                            <MenuItem key={unit} value={unit}>{FIELD_UNIT_LABELS[unit]}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {ignored.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Données ignorées</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Elles restent conservées, mais aucune proposition ne vous est faite.
              </Typography>
              <Stack spacing={1}>
                {ignored.map(entry => (
                  <Box key={entry.metric} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="body2">{entry.label}</Typography>
                    <Button size="small" disabled={savingMetric !== null} onClick={() => handleUnignore(entry.metric)}>
                      Ne plus ignorer
                    </Button>
                  </Box>
                ))}
              </Stack>
            </>
          )}

          {legacyFields.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Nettoyer</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Ces champs de la catégorie « Apple Santé » ont été créés automatiquement par une version précédente. Supprimez ceux qui ne vous servent pas : les données Santé restent conservées et pourront vous être proposées de nouveau.
              </Typography>
              <Stack spacing={1}>
                {legacyFields.map(field => (
                  <Box key={field.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{field.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Reçoit : {healthMetricInfo(field.metric)?.label ?? field.metric}</Typography>
                    </Box>
                    <IconButton
                      aria-label={`Supprimer le champ ${field.name}`}
                      color="error"
                      disabled={savingMetric !== null}
                      onClick={() => setToDelete({ id: field.id, name: field.name })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </>
          )}
        </>
      )}

      <Dialog open={toDelete !== null} onClose={() => !deleting && setToDelete(null)}>
        <DialogTitle>Supprimer « {toDelete?.name} » ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le champ et toutes ses valeurs enregistrées dans votre journal seront supprimés définitivement. Les données Santé brutes restent conservées.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} color="inherit" /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
