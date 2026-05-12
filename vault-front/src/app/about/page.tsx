import { Metadata } from "next";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: "À propos | VaultedMind - Journal de Santé Mentale avec Chiffrement AES-256",
  description: "Découvrez la mission de VaultedMind : fournir un coffre-fort mental numérique sécurisé avec suivi psychologique anonyme et protection de l'héritage numérique.",
};

export default function AboutPage() {
  return <AboutClient />;
}
