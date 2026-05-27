import { Infinity, Sparkles, Waves } from "lucide-react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-[28px] border border-white/10 bg-[#10182b]/90 px-4 py-4 text-left shadow-[0_18px_50px_rgba(2,6,23,0.35)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-8 top-2 h-24 w-24 rounded-full bg-violet-400/10 blur-3xl animate-pulse" />
        <div className="absolute right-0 top-8 h-20 w-20 rounded-full bg-emerald-300/10 blur-3xl animate-pulse [animation-delay:900ms]" />
      </div>

      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-violet-100 shadow-[0_10px_24px_rgba(109,40,217,0.14)]">
            <Infinity className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-violet-100/55">
              {language === "en" ? "Conversation unlocked" : "Η συνομιλία ξεκλείδωσε"}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
              {language === "en" ? "No more timers" : "Χωρίς άλλα timers"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-white/62">
              {language === "en"
                ? "You are now fully connected — a calmer, open conversation can unfold here."
                : "Είστε πλέον πλήρως συνδεδεμένοι — η κουβέντα μπορεί να κυλήσει ήρεμα και ανοιχτά."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2">
          <div className="flex items-center gap-1.5 text-violet-100/90" aria-hidden="true">
            <Waves className="h-4 w-4" />
            <span className="text-xs font-medium tracking-[0.18em] uppercase">Live</span>
          </div>
          <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-1.5 rounded-full bg-violet-100/70 animate-[echo-typing-dots_1.2s_ease-in-out_infinite] [animation-delay:-0.18s]" />
            <span className="h-3 w-1.5 rounded-full bg-violet-100/85 animate-[echo-typing-dots_1.2s_ease-in-out_infinite] [animation-delay:-0.08s]" />
            <span className="h-2.5 w-1.5 rounded-full bg-violet-100/70 animate-[echo-typing-dots_1.2s_ease-in-out_infinite]" />
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-100/80" />
        </div>
      </div>
    </div>
  );
}
