import { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact | VaultedMind - Support et Collaboration",
  description: "Contactez l'équipe de VaultedMind pour toute question sur notre coffre-fort mental numérique ou pour des opportunités de collaboration.",
};

export default function ContactPage() {
  return <ContactClient />;
}