import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil | VaultedMind",
  description: "Gérez vos informations personnelles et vos notifications.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
