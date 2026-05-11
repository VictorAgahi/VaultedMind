import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Champs Personnalisés | VaultedMind",
  description: "Configurez vos propres mesures pour un suivi personnalisé.",
};

export default function FieldsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
