import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'Utilisation | VaultedMind",
  description: "Les conditions d'utilisation de la plateforme VaultedMind.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
