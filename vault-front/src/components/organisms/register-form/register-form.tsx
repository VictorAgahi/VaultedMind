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
      await register(formData);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to register");
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
        maxWidth: 500,
        borderRadius: 4,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)"
      }}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Image src="/assets/logo.png" alt="VaultedMind Logo" width={64} height={64} priority unoptimized />
        </Box>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 700 }}>
          Create Account
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Join VaultedMind today
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
          onChange={handleChange}
          required
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={isLoading}
          sx={{ py: 1.5, mt: 2, borderRadius: 2 }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
        </Button>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Already have an account?{" "}
          <MuiLink component={Link} href="/login" sx={{ fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </MuiLink>
        </Typography>
      </Box>
    </Paper>
  );
};
