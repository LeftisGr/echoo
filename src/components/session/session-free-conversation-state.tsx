import { cn } from "@/lib/utils";
import type { AppLanguage } from "@/lib/presence-types";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div className={cn("relative flex flex-col items-center gap-3 py-2 text-center text-emerald-50", className)} aria-live="polite">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/15 bg-emerald-400/10 shadow-[0_0_36px_rgba(16,185,129,0.12)]">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200/20 [animation-duration:2.4s]" />
        <div className="absolute inset-2 rounded-full bg-emerald-300/15 shadow-[0_0_24px_rgba(110,231,183,0.22)]" />
        <div className="relative h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.65)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium tracking-[0.18em] text-white/80">
          {language === "en" ? "Room is fully unlocked" : "Το room είναι πλήρως ανοιχτό"}
        </p>
        <p className="text-xs leading-5 text-white/55">
          {language === "en" ? "Keep the tone soft." : "Κράτα τον τόνο ήρεμο."}
        </p>
      </div>
    </div>
  );
}
