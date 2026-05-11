"use client";

import React, { startTransition, useEffect, useState } from "react";

interface ClientOnlyDateProps {
  date: string;
  fallback?: string;
}

export const ClientOnlyDate: React.FC<ClientOnlyDateProps> = ({ date, fallback = "-" }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setIsClient(true);
    })
  }, []);

  return (
    <span suppressHydrationWarning>
      {isClient ? new Date(date).toLocaleDateString() : fallback}
    </span>
  );
};
