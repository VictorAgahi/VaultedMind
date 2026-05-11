import { Metadata } from "next";
import AnalyticsClient from "./analytics-client";

export const metadata: Metadata = {
  title: "Analyses | VaultedMind",
  description: "Visualisez vos tendances de bien-être et découvrez des corrélations invisibles.",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
