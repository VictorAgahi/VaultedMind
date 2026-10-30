import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatScreen } from "@/components/ai-insights/chat-screen";

export const metadata: Metadata = {
  title: "Assistant",
  robots: { index: false, follow: false },
};

export default function AIChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatScreen />
    </Suspense>
  );
}
