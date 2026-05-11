import React from "react";
import { Metadata } from "next";
import { AuthLayout } from "@/components/templates/auth-layout/auth-layout";
import { LoginForm } from "@/components/login-form/login-form";

export const metadata: Metadata = {
  title: "Connexion | VaultedMind",
  description: "Accédez à votre coffre-fort numérique sécurisé.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Login"
      description="Access your secure mental vault"
    >
      <LoginForm />
    </AuthLayout>
  );
}
