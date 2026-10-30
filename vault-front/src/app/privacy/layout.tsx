import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité | VaultedMind",
  description: "Ce que VaultedMind collecte, comment vos données sont chiffrées, et vos droits.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
