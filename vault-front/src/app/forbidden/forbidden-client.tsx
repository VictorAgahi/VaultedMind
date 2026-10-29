"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import { StatusPage } from "@/components/status-page/status-page";

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="Accès refusé"
      description="Vous n'avez pas les droits pour ouvrir cette page. Si vous pensez que c'est une erreur, reconnectez-vous."
      actions={
        <>
          <Button component={Link} href="/dashboard" variant="contained" size="large">
            Retour à l&apos;accueil
          </Button>
          <Button component={Link} href="/login" color="inherit" size="large">
            Me reconnecter
          </Button>
        </>
      }
    />
  );
}
