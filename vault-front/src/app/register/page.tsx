import React from "react";
import { AuthLayout } from "@/components/templates/auth-layout/auth-layout";
import { RegisterForm } from "@/components/organisms/register-form/register-form";

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
