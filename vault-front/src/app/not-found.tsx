"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import { StatusPage } from "@/components/status-page/status-page";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Cette page n'existe pas"
      description="Le lien est peut-être ancien ou mal recopié. Votre journal, lui, est toujours là."
      actions={
        <Button component={Link} href="/dashboard" variant="contained" size="large">
          Retour à l&apos;accueil
        </Button>
      }
    />
  );
}
