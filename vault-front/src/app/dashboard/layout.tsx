import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de Bord | VaultedMind",
  description: "Gérez vos journaux quotidiens et suivez votre santé mentale.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
