import { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "VaultedMind | Chiffrement Ultra-Sécurisé pour votre Esprit",
  description: "Plateforme de chiffrement de pointe pour vos pensées, dossiers de santé et héritage numérique. La confidentialité absolue pour votre vie numérique.",
};

export default function Home() {
  return <HomeClient />;
}
