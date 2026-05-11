import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Importation | VaultedMind",
  description: "Importez vos données historiques en toute sécurité.",
};

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
