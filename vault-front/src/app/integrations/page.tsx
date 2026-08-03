import { IntegrationsClient } from "./integrations-client";

export const metadata = {
  title: "Intégrations - Vaulted Mind",
  description: "Gérez vos intégrations (Apple Santé, etc.)",
};

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}
