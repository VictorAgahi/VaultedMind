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
  Link as MuiLink,
  Stack
} from "@mui/material";
import { useAuth } from "@/context/auth-context";
import { ApiError, LoginCredentials } from "@/types";
import Link from "next/link";

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLoginField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const authenticateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      await login(formData);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || "Échec de la connexion");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 2.5, sm: 4 },
        width: "100%",
        maxWidth: 400,
        mx: "auto",
        borderRadius: 4,
      }}
    >
      <Box component="form" onSubmit={authenticateUser} noValidate>
        <Typography variant="h2" component="h1" gutterBottom align="center">
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
            onChange={updateLoginField}
            disabled={isLoggingIn}
          />
          <TextField
            label="Mot de passe"
            name="password"
            type="password"
            fullWidth
            required
            value={formData.password}
            onChange={updateLoginField}
            disabled={isLoggingIn}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoggingIn}
            
          >
            {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
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
