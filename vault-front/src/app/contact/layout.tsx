import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | VaultedMind",
  description: "Contactez l'équipe VaultedMind pour toute question ou support.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
