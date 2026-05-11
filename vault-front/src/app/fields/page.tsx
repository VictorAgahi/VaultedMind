import { Metadata } from "next";
import FieldsClient from "./fields-client";

export const metadata: Metadata = {
  title: "Champs Personnalisés | VaultedMind",
  description: "Personnalisez votre suivi avec vos propres mesures.",
};

export default function FieldsPage() {
  return <FieldsClient />;
}
