"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tabs,
  Tab,
  Fade
} from "@mui/material";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { CorrelationStudy } from "@/components/organisms/correlation-study/correlation-study";
import { apiService } from "@/services/api.service";
import { CustomField, DailyLog, FieldType } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

export default function AnalyticsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Selected fields for the two charts
  const [selectedTrendField, setSelectedTrendField] = useState<string>("");
  const [selectedFreqField, setSelectedFreqField] = useState<string>("");
  const [selectedStringField, setSelectedStringField] = useState<string>("");

  const fetchData = useCallback(async (signal: AbortSignal) => {
    try {
      const [fieldsData, logsData] = await Promise.all([
        apiService.get<CustomField[]>("/health/custom-fields", { signal }),
        apiService.get<DailyLog[]>("/health/daily-logs", { signal })
      ]);
      setFields(fieldsData);
      setLogs(logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()));
      setError(null);

      // Auto-select initial fields
      const numberFields = fieldsData.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
      if (numberFields.length > 0) setSelectedTrendField(numberFields[0].id);

      const stringFields = fieldsData.filter(f => f.fieldType === FieldType.STRING);
      if (stringFields.length > 0) setSelectedStringField(stringFields[0].id);

      const stringAndBoolFields = fieldsData.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);
      if (stringAndBoolFields.length > 0) setSelectedFreqField(stringAndBoolFields[0].id);

    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError("Échec du chargement des données d'analyse");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const trendData = useMemo(() => {
    if (!selectedTrendField) return [];
    const field = fields.find(f => f.id === selectedTrendField);
    if (!field) return [];

    return logs.map(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedTrendField);
      let value: number | null = null;

      if (fv) {
        if (field.fieldType === FieldType.NUMBER) {
          value = parseFloat(fv.value);
        } else if (field.fieldType === FieldType.BOOLEAN) {
          value = fv.value === "true" ? 1 : 0;
        }
      }

      return {
        date: new Date(log.logDate).toLocaleDateString(),
        value: isNaN(value as number) ? null : value
      };
    }).filter(d => d.value !== null);
  }, [logs, selectedTrendField, fields]);

  const freqData = useMemo(() => {
    if (!selectedFreqField) return [];

    const counts: Record<string, number> = {};
    logs.forEach(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedFreqField);
      if (fv && fv.value) {
        let displayVal = fv.value;
        const field = fields.find(f => f.id === selectedFreqField);
        if (field?.fieldType === FieldType.BOOLEAN) {
          displayVal = fv.value === "true" ? "Oui" : "Non";
        }
        counts[displayVal] = (counts[displayVal] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [logs, selectedFreqField, fields]);

  // Data for String Evolution Chart
  const stringEvolutionData = useMemo(() => {
    if (!selectedStringField) return { data: [], valueMap: {} };

    const field = fields.find(f => f.id === selectedStringField);
    if (!field) return { data: [], valueMap: {} };

    const valueMap: Record<string, number> = {};
    const customOrder = field.optionsOrder;

    if (customOrder && customOrder.length > 0) {
      customOrder.forEach((val, idx) => {
        valueMap[val] = idx;
      });
    } else {
      const uniqueValues: Set<string> = new Set();
      logs.forEach(log => {
        const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
        if (fv && fv.value) uniqueValues.add(fv.value);
      });
      Array.from(uniqueValues).forEach((val, idx) => {
        valueMap[val] = idx;
      });
    }

    const chartData = logs.map(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
      let value: number | null = null;
      let label = "";

      if (fv && fv.value && valueMap[fv.value] !== undefined) {
        value = valueMap[fv.value];
        label = fv.value;
      }

      return {
        date: new Date(log.logDate).toLocaleDateString(),
        value,
        label
      };
    }).filter(d => d.value !== null);

    return { data: chartData, valueMap };
  }, [logs, selectedStringField, fields]);

  const stringFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.STRING), [fields]);
  const numberAndBoolFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN), [fields]);
  const stringAndBoolFields = useMemo(() => fields.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN), [fields]);

  const [advSelectedField, setAdvSelectedField] = useState<string>("");
  const activeAdvField = advSelectedField || numberAndBoolFields[0]?.id || "";

  const weeklyProfileData = useMemo(() => {
    if (!activeAdvField) return [];

    const dayTotals: Record<number, { sum: number, count: number }> = {
      0: { sum: 0, count: 0 }, // Dimanche
      1: { sum: 0, count: 0 }, // Lundi
      2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
      6: { sum: 0, count: 0 }
    };

    const field = fields.find(f => f.id === activeAdvField);
    if (!field) return [];

    logs.forEach(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === activeAdvField);
      if (fv && fv.value !== undefined && fv.value !== null) {
        let val = 0;
        if (field.fieldType === FieldType.NUMBER) val = parseFloat(fv.value);
        else if (field.fieldType === FieldType.BOOLEAN) val = fv.value === "true" ? 1 : 0;

        const day = new Date(log.logDate).getDay();
        dayTotals[day].sum += val;
        dayTotals[day].count += 1;
      }
    });

    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((label, index) => ({
      subject: label,
      A: dayTotals[index].count > 0 ? parseFloat((dayTotals[index].sum / dayTotals[index].count).toFixed(2)) : 0,
      fullMark: 10
    }));
  }, [logs, activeAdvField, fields]);

  const statsSummary = useMemo(() => {
    if (!activeAdvField) return null;
    const values: number[] = [];
    const field = fields.find(f => f.id === activeAdvField);

    logs.forEach(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === activeAdvField);
      if (fv && fv.value) {
        if (field?.fieldType === FieldType.NUMBER) values.push(parseFloat(fv.value));
        else if (field?.fieldType === FieldType.BOOLEAN) values.push(fv.value === "true" ? 1 : 0);
      }
    });

    if (values.length === 0) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0; // Coeff de variation

    return {
      mean: mean.toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      volatility: cv.toFixed(1), // Pourcentage de variabilité
      count: values.length
    };
  }, [logs, activeAdvField, fields]);

  return (
    <Box sx={{
      minHeight: "100vh",
      bgcolor: "#ede5d9",
      pb: 8
    }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 900, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
            Tableau de Bord Analytique
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
            Décryptez vos habitudes et découvrez les corrélations invisibles qui influencent votre bien-être.
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#6366f1' },
              '& .MuiTab-root': { fontWeight: 700, fontSize: '1rem', px: 4, minWidth: 'auto' }
            }}
          >
            <Tab label="Évolutions & Fréquences" />
            <Tab label="Étude de Corrélation" />
            <Tab label="Analyses Avancées" />
          </Tabs>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
            <CircularProgress thickness={5} size={60} sx={{ color: "#6366f1" }} />
          </Box>
        ) : (
          <>
            {tabValue === 0 && (
              <Fade in={tabValue === 0}>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12 }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Évolution Qualitative</Typography>
                        <FormControl sx={{ minWidth: 260 }} size="small">
                          <InputLabel>Champ de texte</InputLabel>
                          <Select
                            value={selectedStringField}
                            label="Champ de texte"
                            onChange={(e) => setSelectedStringField(e.target.value)}
                            sx={{ borderRadius: 3 }}
                          >
                            {stringFields.map(f => (
                              <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      {stringEvolutionData.data.length > 0 ? (
                        <Box sx={{ width: "100%", height: 400 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stringEvolutionData.data}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                                formatter={(value) => {
                                  const labels = Object.entries(stringEvolutionData.valueMap);
                                  return labels.find(([, idx]) => idx === value)?.[0] || value;
                                }}
                              />
                              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8 }} />
                            </LineChart>
                          </ResponsiveContainer>
                          <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
                            {Object.entries(stringEvolutionData.valueMap).sort(([, a], [, b]) => a - b).map(([label, idx]) => (
                              <Box key={label} sx={{ px: 2, py: 0.5, bgcolor: "white", borderRadius: 2, border: "1px solid #eee", fontSize: "0.75rem", fontWeight: 600 }}>
                                {idx}: {label}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ) : <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}><Typography color="text.secondary">Données insuffisantes</Typography></Box>}
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 6, height: "100%", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Tendances Numériques</Typography>
                        <FormControl fullWidth size="small">
                          <InputLabel>Mesure</InputLabel>
                          <Select value={selectedTrendField} label="Mesure" onChange={(e) => setSelectedTrendField(e.target.value)} sx={{ borderRadius: 3 }}>
                            {numberAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="date" hide />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 6, height: "100%", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Répartition des Valeurs</Typography>
                        <FormControl fullWidth size="small">
                          <InputLabel>Champ</InputLabel>
                          <Select value={selectedFreqField} label="Champ" onChange={(e) => setSelectedFreqField(e.target.value)} sx={{ borderRadius: 3 }}>
                            {stringAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={freqData}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 12, border: "none" }} />
                            <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Fade>
            )}

            {tabValue === 1 && (
              <Fade in={tabValue === 1}>
                <Box>
                  <CorrelationStudy fields={fields} logs={logs} />
                </Box>
              </Fade>
            )}

            {tabValue === 2 && (
              <Fade in={tabValue === 2}>
                <Box>
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper elevation={0} sx={{ p: 4, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Profil Hebdomadaire</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                          <InputLabel>Champ à analyser</InputLabel>
                          <Select value={activeAdvField} label="Champ à analyser" onChange={(e) => setAdvSelectedField(e.target.value)} sx={{ borderRadius: 3 }}>
                            {numberAndBoolFields.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                          </Select>
                        </FormControl>

                        <Box sx={{ width: "100%", height: 300, display: "flex", justifyContent: "center" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={weeklyProfileData}>
                              <PolarGrid stroke="rgba(0,0,0,0.05)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                              <Radar
                                name="Moyenne"
                                dataKey="A"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
                          Moyenne par jour de la semaine
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                      <Grid container spacing={4}>
                        <Grid size={{ xs: 12 }}>
                          <Paper elevation={0} sx={{ p: 4, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", bgcolor: "rgba(99, 102, 241, 0.03)" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Indicateurs de Stabilité</Typography>
                            {statsSummary ? (
                              <Grid container spacing={3}>
                                {[
                                  { label: "Moyenne Générale", value: statsSummary.mean, color: "#6366f1" },
                                  { label: "Variabilité (CV)", value: `${statsSummary.volatility}%`, color: "#ec4899", info: "Un pourcentage élevé indique des habitudes irrégulières." },
                                  { label: "Minimum", value: statsSummary.min, color: "#94a3b8" },
                                  { label: "Maximum", value: statsSummary.max, color: "#94a3b8" },
                                ].map((stat, i) => (
                                  <Grid size={{ xs: 6, sm: 3 }} key={i}>
                                    <Box sx={{ p: 2, bgcolor: "white", borderRadius: 4, border: "1px solid rgba(0,0,0,0.03)", textAlign: "center" }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{stat.label}</Typography>
                                      <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color }}>{stat.value}</Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                            ) : (
                              <Typography color="text.secondary">Pas assez de données pour générer les statistiques.</Typography>
                            )}
                          </Paper>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                          <Paper elevation={0} sx={{ p: 4, borderRadius: 6, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
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
                </Box>
              </Fade>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
