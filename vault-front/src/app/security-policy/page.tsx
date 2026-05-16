import type { Metadata } from "next";
import SecurityPolicyClient from "./security-policy-client";

export const metadata: Metadata = {
  title: "Politique de Sécurité | VaultedMind",
  description:
    "Découvrez la politique de divulgation responsable des vulnérabilités de VaultedMind. Chiffrement AES-256, conformité OWASP et RGPD.",
  alternates: {
    canonical: "https://vault-mind.cyrus-ag.com/security-policy",
  },
};

export default function SecurityPolicyPage() {
  return <SecurityPolicyClient />;
}
