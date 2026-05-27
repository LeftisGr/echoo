import { Infinity, Sparkles, Waves } from "lucide-react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[16rem] overflow-hidden rounded-full border border-white/10 bg-[#10182b]/90 px-4 py-2 text-left shadow-[0_16px_38px_rgba(2,6,23,0.24)] backdrop-blur-md",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-8 top-0 h-16 w-16 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-14 w-14 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-violet-100">
          <Infinity className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-violet-100/55">
            {language === "en" ? "Conversation unlocked" : "Η συνομιλία ξεκλείδωσε"}
          </p>
          <p className="truncate text-xs font-medium text-white/80">
            {language === "en" ? "No more timers — stay with the moment." : "Χωρίς timers — μείνε στη στιγμή."}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1 text-emerald-100/80 sm:flex" aria-hidden="true">
          <Waves className="h-3.5 w-3.5" />
          <Sparkles className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
