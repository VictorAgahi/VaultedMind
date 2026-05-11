import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyses | VaultedMind",
  description: "Visualisez vos tendances de bien-être et découvrez des corrélations.",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
