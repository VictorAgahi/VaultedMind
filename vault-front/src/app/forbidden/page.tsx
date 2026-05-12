import { Metadata } from "next";
import ForbiddenClient from "./forbidden-client";

export const metadata: Metadata = {
  title: "Accès Refusé | VaultedMind",
  description: "Vous n'avez pas les permissions nécessaires pour accéder à cette zone sécurisée.",
};

export default function ForbiddenPage() {
  return <ForbiddenClient />;
}
