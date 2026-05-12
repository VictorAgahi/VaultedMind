"use client";

import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme,
  useMediaQuery,
  Tooltip as MuiTooltip,
  MenuProps
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { CustomField, DailyLog, FieldType } from "@/types";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip
} from "recharts";

interface AdvancedAnalysesProps {
  fields: CustomField[];
  logs: DailyLog[];
  activeAdvField: string;
  setAdvSelectedField: (id: string) => void;
  ChartContainer: React.FC<{ children: React.ReactNode, aspect: number, mobileAspect?: number, minHeight: number, fullHeight?: boolean }>;
  menuProps?: Partial<MenuProps>;
}

export const AdvancedAnalyses: React.FC<AdvancedAnalysesProps> = ({
  fields,
  logs,
  activeAdvField,
  setAdvSelectedField,
  ChartContainer,
  menuProps
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const advFieldMappings = useMemo(() => {
    const mappings: Record<string, Record<string, number>> = {};
    fields.forEach(field => {
      if (field.fieldType === FieldType.STRING) {
        const valueMap: Record<string, number> = {};
        if (field.optionsOrder && field.optionsOrder.length > 0) {
          field.optionsOrder.forEach((val, idx) => { valueMap[val] = idx; });
        } else {
          const uniqueValues = new Set<string>();
          logs.forEach(log => {
            const fv = log.fieldValues?.find(v => v.customFieldId === field.id);
            if (fv && fv.value) uniqueValues.add(fv.value);
          });
          Array.from(uniqueValues).sort().forEach((val, idx) => { valueMap[val] = idx; });
        }
        mappings[field.id] = valueMap;
      }
    });
    return mappings;
  }, [fields, logs]);

  const getAdvVal = React.useCallback((log: DailyLog, fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    const fv = log.fieldValues?.find(v => v.customFieldId === fieldId);
    if (!field || !fv || fv.value === undefined || fv.value === null) return null;

    if (field.fieldType === FieldType.NUMBER) return parseFloat(fv.value);
    if (field.fieldType === FieldType.BOOLEAN) return fv.value === "true" ? 1 : 0;
    if (field.fieldType === FieldType.STRING) {
      return advFieldMappings[fieldId]?.[fv.value] ?? null;
    }
    return null;
  }, [fields, advFieldMappings]);

  const weeklyProfileData = useMemo(() => {
    if (!activeAdvField) return [];
    const dayTotals: Record<number, { sum: number, count: number }> = {
      0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 }, 6: { sum: 0, count: 0 }
    };

    logs.forEach(log => {
      const val = getAdvVal(log, activeAdvField);
      if (val !== null) {
        const day = log._day ?? new Date(log.logDate).getDay();
        dayTotals[day].sum += val;
        dayTotals[day].count += 1;
      }
    });

    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((label, index) => ({
      subject: label,
      A: dayTotals[index].count > 0 ? parseFloat((dayTotals[index].sum / dayTotals[index].count).toFixed(2)) : 0,
    }));
  }, [logs, activeAdvField, getAdvVal]);

  const statsSummary = useMemo(() => {
    if (!activeAdvField) return null;
    const values = logs.reduce<number[]>((acc, log) => {
      const v = getAdvVal(log, activeAdvField);
      if (v !== null) acc.push(v);
      return acc;
    }, []);

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

    return {
      mean: mean.toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      volatility: cv.toFixed(1),
    };
  }, [logs, activeAdvField, getAdvVal]);

  const refinedPaperStyle = {
    p: { xs: 2, md: 4 },
    borderRadius: 6,
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
    bgcolor: "background.paper",
    height: "100%"
  };

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper elevation={0} sx={refinedPaperStyle}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Profil Hebdomadaire</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 4 }}>
            <InputLabel>Champ à analyser</InputLabel>
            <Select
              value={activeAdvField}
              label="Champ à analyser"
              onChange={(e) => setAdvSelectedField(e.target.value)}
              sx={{ borderRadius: 3 }}
              MenuProps={menuProps}
            >
              {fields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>

          <ChartContainer aspect={1} mobileAspect={1.1} minHeight={300}>
            <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "65%" : "80%"} data={weeklyProfileData}>
              <PolarGrid stroke="rgba(0,0,0,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600, fill: theme.palette.text.secondary }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => {
                  const field = fields.find(f => f.id === activeAdvField);
                  const numVal = Number(val);
                  if (field?.fieldType === FieldType.BOOLEAN) return [`${(numVal * 100).toFixed(0)}% Oui`, "Moyenne"];
                  if (field?.fieldType === FieldType.STRING) {
                    const mapping = advFieldMappings[activeAdvField];
                    if (mapping) {
                      const label = Object.keys(mapping).find(key => mapping[key] === Math.round(numVal));
                      return [label || numVal.toFixed(2), "Valeur"];
                    }
                  }
                  return [numVal.toFixed(2), "Moyenne"];
                }}
              />
              <Radar
                name="Moyenne"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ChartContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
            Moyenne par jour de la semaine
          </Typography>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ ...refinedPaperStyle, bgcolor: "rgba(99, 102, 241, 0.03)" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Indicateurs de Stabilité</Typography>
              {statsSummary ? (
                <Grid container spacing={2}>
                  {[
                    {
                      label: "Moyenne",
                      value: (() => {
                        const field = fields.find(f => f.id === activeAdvField);
                        if (field?.fieldType === FieldType.BOOLEAN) return `${(parseFloat(statsSummary.mean) * 100).toFixed(0)}% Oui`;
                        if (field?.fieldType === FieldType.STRING) {
                          const mapping = advFieldMappings[activeAdvField];
                          if (mapping) {
                            const label = Object.keys(mapping).find(key => mapping[key] === Math.round(parseFloat(statsSummary.mean)));
                            return label || statsSummary.mean;
                          }
                        }
                        return statsSummary.mean;
                      })(),
                      color: "#6366f1"
                    },
                    {
                      label: "Min",
                      value: (() => {
                        const field = fields.find(f => f.id === activeAdvField);
                        if (field?.fieldType === FieldType.BOOLEAN) return statsSummary.min === 1 ? "Oui" : "Non";
                        if (field?.fieldType === FieldType.STRING) {
                          const mapping = advFieldMappings[activeAdvField];
                          if (mapping) {
                            return Object.keys(mapping).find(key => mapping[key] === statsSummary.min) || statsSummary.min;
                          }
                        }
                        return statsSummary.min;
                      })(),
                      color: "#94a3b8"
                    },
                    {
                      label: "Max",
                      value: (() => {
                        const field = fields.find(f => f.id === activeAdvField);
                        if (field?.fieldType === FieldType.BOOLEAN) return statsSummary.max === 1 ? "Oui" : "Non";
                        if (field?.fieldType === FieldType.STRING) {
                          const mapping = advFieldMappings[activeAdvField];
                          if (mapping) {
                            return Object.keys(mapping).find(key => mapping[key] === statsSummary.max) || statsSummary.max;
                          }
                        }
                        return statsSummary.max;
                      })(),
                      color: "#94a3b8"
                    },
                  ].map((stat) => (
                    <Grid size={{ xs: 4 }} key={stat.label}>
                      <Box sx={{ p: { xs: 1, md: 3 }, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(0,0,0,0.03)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 600 }}>{stat.label}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: stat.color, fontSize: { xs: "0.9rem", md: "1.25rem" } }}>{stat.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(0,0,0,0.03)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Variabilité (CV)</Typography>
                        <MuiTooltip title="Le Coefficient de Variation (CV) mesure l'irrégularité. < 20% = Stable, > 50% = Très variable." arrow>
                          <InfoIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "help" }} />
                        </MuiTooltip>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: "#ec4899" }}>{statsSummary.volatility}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">Pas assez de données.</Typography>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={refinedPaperStyle}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Conseil de l&apos;expert</Typography>
              <Typography variant="body1" sx={{ fontStyle: "italic", color: "text.secondary", lineHeight: 1.6 }}>
                {parseFloat(statsSummary?.volatility || "0") > 30
                  ? "Votre routine semble très variable. Pour améliorer votre bien-être, essayez de stabiliser vos habitudes, notamment sur les jours où les pics sont les plus marqués."
                  : "Vous avez une excellente régularité ! Continuez ainsi pour maintenir un équilibre stable."}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
