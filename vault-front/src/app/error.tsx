"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import { StatusPage } from "@/components/status-page/status-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <StatusPage
      title="Quelque chose s'est mal passé"
      description="Une erreur inattendue a interrompu la page. Vos données restent chiffrées et en sécurité."
      actions={
        <>
          <Button onClick={() => reset()} variant="contained" size="large">
            Réessayer
          </Button>
          <Button component={Link} href="/" color="inherit" size="large">
            Retour à l&apos;accueil
          </Button>
        </>
      }
      footer={
        process.env.NODE_ENV === "development" ? (
          <Typography variant="caption" color="error.main" sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
            {error.message}
          </Typography>
        ) : null
      }
    />
  );
}
