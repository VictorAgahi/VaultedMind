"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Grid
} from "@mui/material";
import { Navbar } from "@/components/organisms/navbar/navbar";
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
  Legend,
  ResponsiveContainer
} from "recharts";

export default function AnalyticsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected fields for the two charts
  const [selectedTrendField, setSelectedTrendField] = useState<string>("");
  const [selectedFreqField, setSelectedFreqField] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsData, logsData] = await Promise.all([
          apiService.get<CustomField[]>("/health/custom-fields"),
          apiService.get<DailyLog[]>("/health/daily-logs")
        ]);
        setFields(fieldsData);
        setLogs(logsData.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime()));

        // Auto-select initial fields
        const numberFields = fieldsData.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
        if (numberFields.length > 0) setSelectedTrendField(numberFields[0].id);

        const stringFields = fieldsData.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);
        if (stringFields.length > 0) setSelectedFreqField(stringFields[0].id);

      } catch {
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Data for Trend Chart (Numbers over time)
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

  // Data for Frequency Chart (Occurrences of strings/booleans)
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

  // Selected field for string evolution chart
  const [selectedStringField, setSelectedStringField] = useState<string>("");

  // Data for String Evolution Chart
  const stringEvolutionData = useMemo(() => {
    if (!selectedStringField) return { data: [], valueMap: {} };

    const field = fields.find(f => f.id === selectedStringField);
    if (!field) return { data: [], valueMap: {} };

    // Get all unique values for this field
    const uniqueValues: Set<string> = new Set();
    logs.forEach(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
      if (fv && fv.value) {
        uniqueValues.add(fv.value);
      }
    });

    const valueMap: Record<string, number> = {};
    Array.from(uniqueValues).forEach((val, idx) => {
      valueMap[val] = idx;
    });

    const chartData = logs.map(log => {
      const fv = log.fieldValues?.find(v => v.customFieldId === selectedStringField);
      let value: number | null = null;
      let label = "";

      if (fv && fv.value) {
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

  const stringFields = fields.filter(f => f.fieldType === FieldType.STRING);

  const numberAndBoolFields = fields.filter(f => f.fieldType === FieldType.NUMBER || f.fieldType === FieldType.BOOLEAN);
  const stringAndBoolFields = fields.filter(f => f.fieldType === FieldType.STRING || f.fieldType === FieldType.BOOLEAN);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Analytics & Insights
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Visualize your health patterns and track your progress over time.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={4}>
            {/* Trend Chart */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Evolution Over Time
                  </Typography>
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Select Metric</InputLabel>
                    <Select
                      value={selectedTrendField}
                      label="Select Metric"
                      onChange={(e) => setSelectedTrendField(e.target.value)}
                    >
                      {numberAndBoolFields.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {trendData.length > 0 ? (
                  <Box sx={{ width: "100%", height: 400, minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={fields.find(f => f.id === selectedTrendField)?.name || "Value"}
                          stroke="#d81832"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography color="text.secondary">Not enough data to display trends.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Frequency Chart */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Value Frequency Analysis
                  </Typography>
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Select Field</InputLabel>
                    <Select
                      value={selectedFreqField}
                      label="Select Field"
                      onChange={(e) => setSelectedFreqField(e.target.value)}
                    >
                      {stringAndBoolFields.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {freqData.length > 0 ? (
                  <Box sx={{ width: "100%", height: 400, minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={freqData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                          contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend />
                        <Bar
                          dataKey="count"
                          name="Occurrences"
                          fill="#d81832"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography color="text.secondary">Not enough data to display frequencies.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* String Evolution Chart */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 4, borderRadius: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    String Evolution Over Time
                  </Typography>
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Select Field</InputLabel>
                    <Select
                      value={selectedStringField}
                      label="Select Field"
                      onChange={(e) => setSelectedStringField(e.target.value)}
                    >
                      {stringFields.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {stringEvolutionData.data.length > 0 ? (
                  <>
                    <Box sx={{ width: "100%", height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stringEvolutionData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" />
                          <YAxis
                            type="number"
                            domain={[0, Math.max(...Object.values(stringEvolutionData.valueMap))]}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            formatter={(value) => {
                              const labels = Object.entries(stringEvolutionData.valueMap);
                              const label = labels.find(([, idx]) => idx === value)?.[0];
                              return label || value;
                            }}
                          />
                          <Legend />
                          <Line
                            type="stepAfter"
                            dataKey="value"
                            name={fields.find(f => f.id === selectedStringField)?.name || "Value"}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                    {Object.keys(stringEvolutionData.valueMap).length > 0 && (
                      <Box sx={{ mt: 3, p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                          Value Legend:
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {Object.entries(stringEvolutionData.valueMap).sort(([, a], [, b]) => a - b).map(([label, idx]) => (
                            <Typography key={label} variant="caption" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 12, height: 12, bgcolor: `hsl(${(idx * 60) % 360}, 70%, 50%)`, borderRadius: 1 }} />
                              {idx}: {label}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography color="text.secondary">Not enough data to display string evolution.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
