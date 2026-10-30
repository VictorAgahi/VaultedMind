"use client";

import React from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { CustomField, DailyLog, FieldType } from "@/types";
import { formatHourlyValue } from "@/utils/time-converter";
import { localDateStr } from "@/utils/local-date";

const PERIODS = [
  { days: 14, label: "14 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "90 derniers jours" },
];

const logDay = (log: DailyLog): string => new Date(log.logDate).toISOString().split("T")[0];
const isHourly = (field: CustomField): boolean => (field.optionsOrder ?? []).includes("isHourly");

const displayValue = (field: CustomField, raw: string | undefined): string => {
  if (raw === undefined || raw === "") return "";
  if (field.fieldType === FieldType.BOOLEAN) return raw === "true" ? "Oui" : "Non";
  if (isHourly(field)) return formatHourlyValue(raw);
  return raw.replace(".", ",");
};

const formatNumber = (value: number): string => String(Math.round(value * 10) / 10).replace(".", ",");

// Courbe en noir et gris : lisible une fois imprimée, sans dépendre de la couleur.
const PrintableLine: React.FC<{ points: { day: string; value: number }[]; min: number; max: number }> = ({ points, min, max }) => {
  const width = 640;
  const height = 140;
  const pad = { left: 28, right: 8, top: 8, bottom: 18 };
  if (points.length < 2) return null;
  const range = max - min || 1;
  const x = (i: number) => pad.left + (i * (width - pad.left - pad.right)) / (points.length - 1);
  const y = (v: number) => pad.top + ((max - v) * (height - pad.top - pad.bottom)) / range;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  return (
    <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Évolution sur la période">
      {[min, (min + max) / 2, max].map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#cccccc" strokeWidth={1} />
          <text x={pad.left - 6} y={y(tick) + 4} fontSize={10} textAnchor="end" fill="#555555">{formatNumber(tick)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#111111" strokeWidth={2} />
      {points.map((p, i) => <circle key={p.day} cx={x(i)} cy={y(p.value)} r={2.5} fill="#111111" />)}
      <text x={pad.left} y={height - 4} fontSize={10} fill="#555555">{points[0].day.split("-").reverse().slice(0, 2).join("/")}</text>
      <text x={width - pad.right} y={height - 4} fontSize={10} textAnchor="end" fill="#555555">{points[points.length - 1].day.split("-").reverse().slice(0, 2).join("/")}</text>
    </Box>
  );
};

export function TherapistExport() {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<CustomField[]>([]);
  const [logs, setLogs] = React.useState<DailyLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [periodDays, setPeriodDays] = React.useState(30);
  const [selectedIds, setSelectedIds] = React.useState<string[] | null>(null);
  const [includeNotes, setIncludeNotes] = React.useState(false);
  const [nowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [fieldsData, logsData] = await Promise.all([
          apiService.get<CustomField[]>("/health/custom-fields", { signal: controller.signal }),
          apiService.get<DailyLog[]>("/health/daily-logs", { signal: controller.signal }),
        ]);
        setFields(fieldsData.filter((f) => f.isActive));
        setLogs(logsData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Les données n'ont pas pu être chargées.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const chosenIds = selectedIds ?? fields.map((f) => f.id);
  const chosenFields = fields.filter((f) => chosenIds.includes(f.id));
  const from = localDateStr(new Date(nowMs - (periodDays - 1) * 86_400_000));
  const to = localDateStr(new Date(nowMs));
  const periodLogs = logs.filter((l) => logDay(l) >= from && logDay(l) <= to).sort((a, b) => logDay(a).localeCompare(logDay(b)));
  const valueOf = (log: DailyLog, fieldId: string) => log.fieldValues?.find((fv) => fv.customFieldId === fieldId)?.value;

  const summaries = chosenFields.map((field) => {
    const raw = periodLogs.map((log) => valueOf(log, field.id)).filter((v): v is string => v !== undefined && v !== "");
    if (field.fieldType === FieldType.BOOLEAN) {
      const yes = raw.filter((v) => v === "true").length;
      return { field, text: `${yes} jour${yes > 1 ? "s" : ""} sur ${raw.length} renseigné${raw.length > 1 ? "s" : ""}` };
    }
    if (field.fieldType === FieldType.NUMBER) {
      const nums = raw.map(parseFloat).filter(Number.isFinite);
      if (nums.length === 0) return { field, text: "Aucune valeur" };
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      const fmt = (v: number) => (isHourly(field) ? formatHourlyValue(String(v)) : formatNumber(v));
      return { field, text: `moyenne ${fmt(avg)}, de ${fmt(Math.min(...nums))} à ${fmt(Math.max(...nums))} (${nums.length} jours)` };
    }
    const counts = raw.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v, c]) => `${v} (${c})`).join(", ");
    return { field, text: top || "Aucune valeur" };
  });

  const chartField = chosenFields.find((f) => f.fieldType === FieldType.NUMBER && /humeur/i.test(f.name)) ?? chosenFields.find((f) => f.fieldType === FieldType.NUMBER && !isHourly(f));
  const chartPoints = chartField
    ? periodLogs
        .map((log) => ({ day: logDay(log), value: parseFloat(valueOf(log, chartField.id) ?? "") }))
        .filter((p) => Number.isFinite(p.value))
    : [];

  const toggleField = (id: string) =>
    setSelectedIds((prev) => {
      const current = prev ?? fields.map((f) => f.id);
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });

  if (loading) {
    return <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Box className="no-print" sx={{ display: "grid", gap: 2, mb: 3 }}>
        <Button component={Link} href="/profile" startIcon={<ArrowBackRoundedIcon />} color="inherit" sx={{ justifySelf: "start" }}>
          Profil
        </Button>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}>Exporter pour mon thérapeute</Typography>
        <Typography color="text.secondary">
          Un résumé lisible de votre suivi, à imprimer ou à enregistrer en PDF depuis le menu d&apos;impression. Rien n&apos;est envoyé : le document est créé sur votre appareil.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ p: 2, borderRadius: 4, bgcolor: "background.paper", display: "grid", gap: 1.5 }}>
          <TextField select label="Période" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} margin="none">
            {PERIODS.map((p) => <MenuItem key={p.days} value={p.days}>{p.label}</MenuItem>)}
          </TextField>
          <Typography variant="subtitle2">Champs à inclure</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2 }}>
            {fields.map((field) => (
              <FormControlLabel
                key={field.id}
                control={<Checkbox checked={chosenIds.includes(field.id)} onChange={() => toggleField(field.id)} />}
                label={field.name}
              />
            ))}
          </Box>
          <FormControlLabel
            control={<Checkbox checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />}
            label="Inclure mes notes (désactivé par défaut)"
          />
          <Button variant="contained" size="large" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()} disabled={periodLogs.length === 0}>
            Imprimer ou enregistrer en PDF
          </Button>
        </Box>
      </Box>

      {/* Document imprimé */}
      <Box className="print-sheet" sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, bgcolor: "background.paper", display: "grid", gap: 2.5 }}>
        <Box className="print-avoid-break">
          <Typography variant="h3" component="h2">Suivi de bien-être</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.firstName ? `${user.firstName}, ` : ""}du {from.split("-").reverse().join("/")} au {to.split("-").reverse().join("/")}, {periodLogs.length} jour{periodLogs.length > 1 ? "s" : ""} noté{periodLogs.length > 1 ? "s" : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Document personnel issu d&apos;un journal d&apos;auto-observation. Ce n&apos;est pas un document médical.
          </Typography>
        </Box>

        {periodLogs.length === 0 ? (
          <Typography color="text.secondary">Aucune journée notée sur cette période.</Typography>
        ) : (
          <>
            {chartField && chartPoints.length >= 2 && (
              <Box className="print-avoid-break" sx={{ display: "grid", gap: 1 }}>
                <Typography variant="subtitle1">{chartField.name}</Typography>
                <PrintableLine
                  points={chartPoints}
                  min={chartField.min ?? Math.min(...chartPoints.map((p) => p.value))}
                  max={chartField.max ?? Math.max(...chartPoints.map((p) => p.value))}
                />
              </Box>
            )}

            <Box className="print-avoid-break" sx={{ display: "grid", gap: 0.75 }}>
              <Typography variant="subtitle1">Résumé</Typography>
              {summaries.map(({ field, text }) => (
                <Typography key={field.id} variant="body2"><strong>{field.name} :</strong> {text}</Typography>
              ))}
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", "& th, & td": { borderBottom: "1px solid var(--mui-palette-divider)", p: 0.75, textAlign: "left", verticalAlign: "top" }, "& th": { fontWeight: 700 } }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    {chosenFields.map((f) => <th key={f.id}>{f.name}</th>)}
                    {includeNotes && <th>Notes</th>}
                  </tr>
                </thead>
                <tbody>
                  {periodLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{logDay(log).split("-").reverse().slice(0, 2).join("/")}</td>
                      {chosenFields.map((f) => <td key={f.id}>{displayValue(f, valueOf(log, f.id))}</td>)}
                      {includeNotes && <td>{log.notes}</td>}
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
