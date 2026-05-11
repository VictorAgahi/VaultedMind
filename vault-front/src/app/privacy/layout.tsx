import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité | VaultedMind",
  description: "Découvrez comment nous protégeons vos données avec un chiffrement de bout en bout.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
