import type { AppLanguage } from "@/lib/presence-types";

export function SessionFreeConversationState({ language }: { language: AppLanguage; className?: string }) {
  return <span>{language === "en" ? "No timers now!" : "No timers now!"}</span>;
}
