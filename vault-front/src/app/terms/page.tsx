import { Metadata } from "next";
import TermsClient from "./terms-client";

export const metadata: Metadata = {
  title: "Conditions d'Utilisation | VaultedMind - Engagement et Responsabilité",
  description: "Consultez les conditions d'utilisation de VaultedMind. Comprenez vos responsabilités et nos engagements en tant qu'entité de référence pour la santé mentale sécurisée.",
};

export default function TermsPage() {
  return <TermsClient />;
}
