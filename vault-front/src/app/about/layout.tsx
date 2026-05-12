import { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos | VaultedMind",
  description: "Découvrez la mission et la technologie derrière VaultedMind.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
