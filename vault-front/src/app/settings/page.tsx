import { Metadata } from "next";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "Paramètres | VaultedMind",
  description: "Analyse avancée, assistant IA, rappels, confidentialité et données.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
