import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intelligence Artificielle",
  description:
    "Vos analyses IA personnalisées, prédictions et assistant intelligent pour mieux comprendre vos données de bien-être.",
};

export default function AILayout({ children }: { children: React.ReactNode }) {
  return children;
}
