import { Metadata } from "next";
import PrivacyClient from "./privacy-client";

export const metadata: Metadata = {
  title: "Confidentialité | VaultedMind - Protection de vos données de santé mentale",
  description: "Apprenez-en plus sur notre politique de confidentialité, notre conformité au RGPD et l'utilisation du chiffrement AES-256 pour protéger vos pensées.",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
