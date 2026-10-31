"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { apiService } from "@/services/api.service";
import { AppleWatchMetric, CustomField, UpdateCustomFieldDto } from "@/types";
import { fieldSuitsMetric, HEALTH_METRICS, healthMetricInfo } from "@/utils/health-metrics";

const AUTO_CREATE = "";

/** Pour chaque donnée Santé, le champ qui la reçoit : un champ existant ou un champ créé automatiquement. */
export const HealthFieldMapping = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMetric, setSavingMetric] = useState<AppleWatchMetric | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = async () => {
    try {
      const data = await apiService.get<CustomField[]>("/health/custom-fields");
      setFields(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos champs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFields();
  }, []);

  const handleChange = async (metric: AppleWatchMetric, fieldId: string) => {
    const current = fields.find(f => f.appleWatchMetric === metric);
    if ((current?.id ?? AUTO_CREATE) === fieldId) return;
    setSavingMetric(metric);
    setError(null);
    try {
      if (fieldId === AUTO_CREATE) {
        if (current) {
          await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${current.id}`, { appleWatchMetric: null });
        }
      } else {
        await apiService.patch<CustomField, UpdateCustomFieldDto>(`/health/custom-fields/${fieldId}`, { appleWatchMetric: metric });
      }
      await fetchFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer ce choix.");
    } finally {
      setSavingMetric(null);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Où vont mes données Santé
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choisissez le champ qui reçoit chaque donnée. Par défaut, VaultedMind utilise un champ au nom correspondant s&apos;il n&apos;y en a qu&apos;un, sinon il en crée un dans la catégorie « Apple Santé ». Un champ ne reçoit qu&apos;une seule donnée, et une donnée ne va que dans un seul champ.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {HEALTH_METRICS.map(info => {
            const current = fields.find(f => f.appleWatchMetric === info.metric);
            const options = fields.filter(f => f.id === current?.id || fieldSuitsMetric(f, info.metric));
            const labelId = `health-mapping-${info.metric}`;
            return (
              <Box
                key={info.metric}
                sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, gap: { xs: 1, sm: 2 } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography id={labelId} variant="body1" sx={{ fontWeight: 600 }}>{info.label}</Typography>
                  <Typography variant="caption" color="text.secondary">En {info.unitHint}</Typography>
                </Box>
                <FormControl size="small" sx={{ width: { xs: "100%", sm: 320 } }}>
                  <Select
                    value={current?.id ?? AUTO_CREATE}
                    onChange={(e) => handleChange(info.metric, e.target.value)}
                    disabled={savingMetric !== null}
                    displayEmpty
                    inputProps={{ "aria-labelledby": labelId }}
                  >
                    <MenuItem value={AUTO_CREATE}><em>Créer automatiquement</em></MenuItem>
                    {options.map(f => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.name}
                        {f.appleWatchMetric && f.appleWatchMetric !== info.metric ? ` (reçoit déjà : ${healthMetricInfo(f.appleWatchMetric)?.label ?? "une autre donnée"})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};
