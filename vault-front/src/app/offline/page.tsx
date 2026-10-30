"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { StatusPage } from "@/components/status-page/status-page";

export default function OfflinePage() {
  return (
    <StatusPage
      title="Vous êtes hors ligne"
      description="Cette page n'est pas disponible sans connexion. Les journées que vous notez hors ligne sont gardées sur votre appareil et envoyées dès le retour du réseau."
      actions={
        <>
          <Button component={Link} href="/dashboard" variant="contained" size="large">
            Ouvrir mon journal
          </Button>
          <Button onClick={() => window.location.reload()} color="inherit" size="large">
            Réessayer
          </Button>
        </>
      }
    />
  );
}
