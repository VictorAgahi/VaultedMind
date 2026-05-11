import React from "react";
import { Metadata } from "next";
import { AuthLayout } from "@/components/templates/auth-layout/auth-layout";
import { RegisterForm } from "@/components/register-form/register-form";

export const metadata: Metadata = {
  title: "Inscription | VaultedMind",
  description: "Créez votre espace sécurisé pour votre bien-être mental.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Register"
      description="Create your secure mental vault"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
