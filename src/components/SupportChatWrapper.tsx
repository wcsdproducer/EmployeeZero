"use client";
import dynamic from "next/dynamic";

const SupportChat = dynamic(() => import("@/components/SupportChat"), { ssr: false });

export default function SupportChatWrapper() {
  return <SupportChat />;
}
