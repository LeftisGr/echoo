import { Infinity, Mic, Sparkles, Waves } from "lucide-react";

import type { AppLanguage } from "@/lib/presence-types";
import { cn } from "@/lib/utils";

export function SessionFreeConversationState({ language, className }: { language: AppLanguage; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1728]/92 px-4 py-4 text-left shadow-[0_24px_60px_rgba(2,6,23,0.26)] backdrop-blur-md sm:px-5 sm:py-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-24 w-24 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute inset-x-8 bottom-0 h-14 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-50">
            <Infinity className="h-3.5 w-3.5" />
            {language === "en" ? "Conversation flowing naturally" : "Η κουβέντα κυλά φυσικά"}
          </div>
          <div className="flex items-center gap-1.5 text-emerald-100/80" aria-hidden="true">
            <Waves className="h-3.5 w-3.5" />
            <Sparkles className="h-3 w-3" />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">
            {language === "en" ? "No timer now" : "Χωρίς timer τώρα"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
            {language === "en" ? "Let the room breathe." : "Άφησε το room να αναπνεύσει."}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {language === "en"
              ? "The countdown is finished. Keep talking, shift into voice, or leave whenever the moment feels complete."
              : "Το countdown τελείωσε. Συνέχισε να μιλάς, πέρασε στη φωνή ή φύγε όταν η στιγμή νιώσει ολοκληρωμένη."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/60">
            {language === "en" ? "Text open" : "Text ανοιχτό"}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/60">
            {language === "en" ? "Voice open" : "Φωνή ανοιχτή"}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/60">
            {language === "en" ? "Leave anytime" : "Φεύγεις όποτε"}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-emerald-100">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">
              {language === "en" ? "Room state" : "Κατάσταση room"}
            </p>
            <p className="truncate text-sm text-white/72">
              {language === "en" ? "The conversation can settle into its own pace." : "Η κουβέντα μπορεί να βρει τον δικό της ρυθμό."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
