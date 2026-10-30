"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Link as MuiLink
} from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { ApiError, RegisterData } from "@/types";
import Link from "next/link";

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: "",
    password: "",
    firstName: "",
    healthDataConsent: false,
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFormField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms || !formData.healthDataConsent) {
      setError("Les deux accords sont nécessaires pour créer votre carnet.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await register({ ...formData, firstName: formData.firstName?.trim() || undefined });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || "Échec de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 2.5, sm: 4 },
        width: "100%",
        maxWidth: 500,
        mx: "auto",
        borderRadius: 4,
      }}
    >
      <Box component="form" onSubmit={registerUser} noValidate>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Créer un compte
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Rejoignez VaultedMind dès aujourd&apos;hui
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 1 }}>
          <TextField
            label="Prénom (facultatif)"
            name="firstName"
            autoComplete="given-name"
            fullWidth
            value={formData.firstName}
            onChange={updateFormField}
            helperText="Pour vous saluer par votre prénom. Il est stocké chiffré."
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={updateFormField}
            required
          />
          <TextField
            label="Mot de passe"
            name="password"
            type="password"
            fullWidth
            value={formData.password}
            onChange={updateFormField}
            required
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              J&apos;accepte les{" "}
              <MuiLink component={Link} href="/terms" target="_blank" sx={{ fontWeight: 600, textDecoration: "none" }}>
                conditions d&apos;utilisation
              </MuiLink>
              {" "}et la{" "}
              <MuiLink component={Link} href="/privacy" target="_blank" sx={{ fontWeight: 600, textDecoration: "none" }}>
                politique de confidentialité
              </MuiLink>
            </Typography>
          }
          sx={{ mt: 1, alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.5 } }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.healthDataConsent}
              onChange={(e) => setFormData((prev) => ({ ...prev, healthDataConsent: e.target.checked }))}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              J&apos;accepte que VaultedMind traite les données de bien-être que je saisis (humeur, sommeil, habitudes, notes) pour me les afficher et les analyser. Je peux les exporter ou les supprimer à tout moment.
            </Typography>
          }
          sx={{ mb: 2, mt: 1, alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.5 } }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isSubmitting || !acceptedTerms || !formData.healthDataConsent}
          sx={{ py: 1.5, mt: 1, borderRadius: 2 }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "S'inscrire"}
        </Button>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Vous avez déjà un compte ?{" "}
          <MuiLink component={Link} href="/login" sx={{ fontWeight: 600, textDecoration: "none" }}>
            Se connecter
          </MuiLink>
        </Typography>
      </Box>
    </Paper>
  );
};
