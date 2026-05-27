import type { AppLanguage } from "@/lib/presence-types";

export function SessionFreeConversationState({ language }: { language: AppLanguage; className?: string }) {
  return (
    <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/75">
      {language === "en" ? "No timer. Enjoy the moment." : "Χωρίς timer. Απόλαυσε τη στιγμή."}
    </div>
  );
}
