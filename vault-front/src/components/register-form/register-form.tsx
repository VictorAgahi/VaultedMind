"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link as MuiLink
} from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { ApiError, RegisterData } from "@/types";
import Image from "next/image";
import Link from "next/link";

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFormField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await register(formData);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || "Échec de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        width: "100%",
        maxWidth: 500,
        borderRadius: 4,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)"
      }}
    >
      <Box component="form" onSubmit={registerUser} noValidate>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Image src="/assets/logo.png" alt="VaultedMind Logo" width={64} height={64} priority />
        </Box>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
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

        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={updateFormField}
          required
        />

        <TextField
          label="Mot de passe"
          name="password"
          type="password"
          value={formData.password}
          onChange={updateFormField}
          required
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isSubmitting}
          sx={{ py: 1.5, mt: 2, borderRadius: 2 }}
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
