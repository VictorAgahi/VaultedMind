"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  Container,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { CustomField } from "@/types";
import { BrandSeal } from "@/components/brand/brand-mark";
import { FIELD_PACKS, ONBOARDING_GOALS, PackField } from "./field-packs";

const REMINDER_SLOTS = ["19:00", "20:00", "20:30", "21:00", "21:30", "22:00"];

export function OnboardingFlow() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = React.useState(0);
  const [firstName, setFirstName] = React.useState(user?.firstName ?? "");
  const [goalId, setGoalId] = React.useState<string>("humeur");
  const [selectedPacks, setSelectedPacks] = React.useState<string[]>(["essentiel"]);
  const [removedFields, setRemovedFields] = React.useState<string[]>([]);
  const [reminderTime, setReminderTime] = React.useState("21:00");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const chooseGoal = (id: string) => {
    setGoalId(id);
    setSelectedPacks(ONBOARDING_GOALS.find((g) => g.id === id)?.packs ?? ["essentiel"]);
  };

  const togglePack = (id: string) =>
    setSelectedPacks((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleField = (key: string) =>
    setRemovedFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const chosenFields: PackField[] = FIELD_PACKS.filter((pack) => selectedPacks.includes(pack.id))
    .flatMap((pack) => pack.fields)
    .filter((field) => !removedFields.includes(field.key));

  // Si aucun pack n'est gardé, on applique l'essentiel : un compte ne doit jamais rester sans champ.
  const fieldsToCreate = chosenFields.length > 0 ? chosenFields : FIELD_PACKS[0].fields;

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      let quickCheckinFieldId: string | undefined;
      for (const field of fieldsToCreate) {
        const created = await apiService.post<CustomField>("/health/custom-fields", {
          name: field.name,
          fieldType: field.fieldType,
          category: field.category,
          min: field.min,
          max: field.max,
          optionsOrder: field.optionsOrder,
        });
        if (field.quickCheckin) quickCheckinFieldId = created.id;
      }
      await apiService.patch("/users/me/preferences", {
        firstName: firstName.trim() || null,
        reminderTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(quickCheckinFieldId && { quickCheckinFieldId }),
      });
      await refreshUser();
      window.dispatchEvent(new CustomEvent("vaultedmind:fields-updated"));
      router.replace("/dashboard?new=1");
    } catch (err) {
      setError((err as Error).message || "La configuration n'a pas pu être enregistrée. Réessayez.");
      setSaving(false);
    }
  };

  const steps = ["Vous", "À suivre", "Rappel"];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Container maxWidth="sm" sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, py: { xs: 3, md: 6 }, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <BrandSeal size={36} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              Étape {step + 1} sur {steps.length}
            </Typography>
            <LinearProgress variant="determinate" value={((step + 1) / steps.length) * 100} sx={{ height: 4, borderRadius: 2, bgcolor: "action.hover" }} />
          </Box>
        </Box>

        {step === 0 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h2" component="h1">Bienvenue dans votre carnet</Typography>
            <Typography color="text.secondary">Deux questions pour le préparer. Tout reste modifiable ensuite.</Typography>
            <TextField
              label="Comment voulez-vous qu'on vous appelle ? (facultatif)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              margin="none"
            />
            <Typography variant="subtitle1" sx={{ mt: 1 }}>Qu&apos;aimeriez-vous mieux comprendre ?</Typography>
            <Box sx={{ display: "grid", gap: 1 }} role="radiogroup" aria-label="Objectif">
              {ONBOARDING_GOALS.map((goal) => {
                const selected = goal.id === goalId;
                return (
                  <ButtonBase
                    key={goal.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseGoal(goal.id)}
                    sx={{
                      justifyContent: "space-between",
                      p: 2,
                      minHeight: 56,
                      borderRadius: 3,
                      textAlign: "left",
                      bgcolor: selected ? "primary.light" : "background.paper",
                      color: selected ? "primary.main" : "text.primary",
                      fontWeight: selected ? 700 : 500,
                    }}
                  >
                    {goal.label}
                    {selected && <CheckRoundedIcon />}
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h2" component="h1">Que voulez-vous suivre ?</Typography>
            <Typography color="text.secondary">
              Nous avons présélectionné des champs selon votre objectif. Touchez un champ pour le retirer.
            </Typography>
            {FIELD_PACKS.map((pack) => {
              const included = selectedPacks.includes(pack.id);
              return (
                <Box key={pack.id} sx={{ p: 2, borderRadius: 4, bgcolor: "background.paper", display: "grid", gap: 1.25 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Checkbox
                      checked={included}
                      onChange={() => togglePack(pack.id)}
                      slotProps={{ input: { "aria-label": `Inclure le pack ${pack.title}` } }}
                      sx={{ mt: -0.75, ml: -1 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{pack.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{pack.description}</Typography>
                    </Box>
                  </Box>
                  {included && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {pack.fields.map((field) => {
                        const kept = !removedFields.includes(field.key);
                        return (
                          <Chip
                            key={field.key}
                            label={field.name}
                            onClick={() => toggleField(field.key)}
                            icon={kept ? <CheckRoundedIcon /> : undefined}
                            aria-pressed={kept}
                            sx={{
                              height: 36,
                              bgcolor: kept ? "primary.light" : "action.hover",
                              color: kept ? "primary.main" : "text.secondary",
                              textDecoration: kept ? "none" : "line-through",
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary">
              {fieldsToCreate.length} champ{fieldsToCreate.length > 1 ? "s" : ""} seront créés. Vous pourrez en ajouter d&apos;autres dans Profil, puis Mes champs.
            </Typography>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h2" component="h1">Un rappel le soir ?</Typography>
            <Typography color="text.secondary">
              Un seul rappel par jour, seulement si vous n&apos;avez pas encore noté votre journée. Vous pourrez l&apos;activer dans votre profil.
            </Typography>
            <TextField select label="Heure du rappel" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} margin="none">
              {REMINDER_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>{slot.replace(":", " h ")}</MenuItem>
              ))}
            </TextField>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        <Box sx={{ mt: "auto", display: "flex", gap: 1, pb: "env(safe-area-inset-bottom, 0px)" }}>
          {step > 0 && (
            <Button color="inherit" onClick={() => setStep((s) => s - 1)} disabled={saving} sx={{ flex: 1 }}>
              Précédent
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button variant="contained" size="large" onClick={() => setStep((s) => s + 1)} sx={{ flex: 2 }}>
              Continuer
            </Button>
          ) : (
            <Button variant="contained" size="large" onClick={finish} disabled={saving} sx={{ flex: 2 }}>
              {saving ? "Préparation…" : "Noter ma première journée"}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
}
