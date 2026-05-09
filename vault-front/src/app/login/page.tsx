import React from "react";
import { AuthLayout } from "@/components/templates/auth-layout/auth-layout";
import { LoginForm } from "@/components/organisms/login-form/login-form";

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
