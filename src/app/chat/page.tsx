"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const AIChat = dynamic(
  () => import("@/features/ai-chat/components/AIChat").then(m => ({ default: m.AIChat })),
  { ssr: false, loading: () => <div style={{ padding: "2rem", textAlign: "center" }}>Loading CivicBot...</div> }
);

export default function ChatPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  return (
    <main style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <AIChat sessionId={sessionId} />
    </main>
  );
}


