import { Metadata } from "next";
import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "Profil | VaultedMind",
  description: "Gérez votre compte et vos préférences de notifications.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
