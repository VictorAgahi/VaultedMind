import { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Tableau de Bord | VaultedMind",
  description: "Suivez votre santé mentale et gérez vos journaux quotidiens.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
