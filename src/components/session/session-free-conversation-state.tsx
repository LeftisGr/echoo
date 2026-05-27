import { Infinity, Sparkles, Waves } from "lucide-react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[12.5rem] overflow-hidden rounded-full border border-white/10 bg-[#10182b]/90 px-3 py-1 text-left shadow-[0_16px_38px_rgba(2,6,23,0.24)] backdrop-blur-md",
        className,
      )}

    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-8 top-0 h-14 w-14 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-12 w-12 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-emerald-100">
          <Infinity className="h-3 w-3" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-medium uppercase tracking-[0.24em] text-white/42">
            {language === "en" ? "Open" : "Ανοιχτό"}
          </p>
          <p className="truncate text-[10px] font-medium text-white/68">
            {language === "en" ? "No timers." : "Χωρίς timers."}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1 text-emerald-100/80 sm:flex" aria-hidden="true">
          <Waves className="h-3 w-3" />
          <Sparkles className="h-2.5 w-2.5" />
        </div>
      </div>
    </div>
  );
}
