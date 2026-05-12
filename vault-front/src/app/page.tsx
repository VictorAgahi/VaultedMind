import { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "VaultedMind | Journal de Santé Mentale avec Chiffrement AES-256",
  description: "Le coffre-fort mental numérique de référence pour un suivi psychologique anonyme et la sécurisation de votre héritage numérique. Sécurité AES-256, OWASP & GDPR.",
};

export default function Home() {
  return <HomeClient />;
}
