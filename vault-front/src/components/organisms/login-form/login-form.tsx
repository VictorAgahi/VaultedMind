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
  FormControlLabel,
  Checkbox,
  Link as MuiLink,
  Stack
} from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { ApiError, LoginCredentials } from "@/types";
import Image from "next/image";
import Link from "next/link";

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(formData);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || "Échec de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        width: "100%",
        maxWidth: 400,
        borderRadius: 4,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)"
      }}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Image src="/assets/logo.png" alt="VaultedMind Logo" width={64} height={64} priority />
        </Box>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
          Bon retour
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Veuillez entrer vos identifiants
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            label="Email"
            name="email"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
          <TextField
            label="Mot de passe"
            name="password"
            type="password"
            fullWidth
            required
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FormControlLabel
              control={<Checkbox size="small" color="primary" defaultChecked />}
              label={<Typography variant="body2">Se souvenir de moi</Typography>}
            />
            <MuiLink component={Link} href="/forgot-password" variant="body2" sx={{ fontWeight: 600, textDecoration: "none" }}>
              Mot de passe oublié ?
            </MuiLink>
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading}
            sx={{ py: 1.5, borderRadius: 2, fontSize: "1.1rem" }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
          </Button>

          <Typography variant="body2" align="center">
            Vous n&apos;avez pas de compte ?{" "}
            <MuiLink component={Link} href="/register" sx={{ fontWeight: 600, textDecoration: "none" }}>
              S&apos;inscrire
            </MuiLink>
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};
