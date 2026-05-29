import { cn } from "@/lib/utils";
import type { AppLanguage } from "@/lib/presence-types";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-emerald-300/15 bg-emerald-400/10 px-5 py-5 text-center text-emerald-50 shadow-[0_18px_60px_rgba(16,185,129,0.12)]",
        className,
      )}
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/15 bg-white/5">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200/20 [animation-duration:2.4s]" />
          <div className="absolute inset-2 rounded-full bg-emerald-300/15 shadow-[0_0_24px_rgba(110,231,183,0.22)]" />
          <div className="relative h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_14px_rgba(167,243,208,0.65)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium tracking-[0.18em] text-white/80">
            {language === "en" ? "Connection unlocked" : "Η σύνδεση ξεκλείδωσε"}
          </p>
          <p className="text-xs leading-5 text-white/55">
            {language === "en"
              ? "The room can breathe now."
              : "Το room μπορεί τώρα να αναπνεύσει."}
          </p>
        </div>
      </div>
    </div>
  );
}
